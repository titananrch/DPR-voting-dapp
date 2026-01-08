// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

abstract contract Admin {
    address public admin;
    error NotAdmin();

    modifier onlyAdmin() {
        if (msg.sender != admin) {
            revert NotAdmin();
        }
        _;
    }
    
    event AdminChanged(address indexed previousAdmin, address indexed newAdmin);

    function _setAdmin(address _admin) internal {
        address prev = admin;
        admin = _admin;
        emit AdminChanged(prev, _admin);
    }
}
