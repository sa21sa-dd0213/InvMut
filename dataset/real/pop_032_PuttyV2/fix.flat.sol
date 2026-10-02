// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

library Address {

    function isContract(address account) internal view returns (bool) {

        return account.code.length > 0;
    }

    function sendValue(address payable recipient, uint256 amount) internal {
        require(address(this).balance >= amount, "Address: insufficient balance");

        (bool success, ) = recipient.call{value: amount}("");
        require(success, "Address: unable to send value, recipient may have reverted");
    }

    function functionCall(address target, bytes memory data) internal returns (bytes memory) {
        return functionCall(target, data, "Address: low-level call failed");
    }

    function functionCall(
        address target,
        bytes memory data,
        string memory errorMessage
    ) internal returns (bytes memory) {
        return functionCallWithValue(target, data, 0, errorMessage);
    }

    function functionCallWithValue(
        address target,
        bytes memory data,
        uint256 value
    ) internal returns (bytes memory) {
        return functionCallWithValue(target, data, value, "Address: low-level call with value failed");
    }

    function functionCallWithValue(
        address target,
        bytes memory data,
        uint256 value,
        string memory errorMessage
    ) internal returns (bytes memory) {
        require(address(this).balance >= value, "Address: insufficient balance for call");
        require(isContract(target), "Address: call to non-contract");

        (bool success, bytes memory returndata) = target.call{value: value}(data);
        return verifyCallResult(success, returndata, errorMessage);
    }

    function functionStaticCall(address target, bytes memory data) internal view returns (bytes memory) {
        return functionStaticCall(target, data, "Address: low-level static call failed");
    }

    function functionStaticCall(
        address target,
        bytes memory data,
        string memory errorMessage
    ) internal view returns (bytes memory) {
        require(isContract(target), "Address: static call to non-contract");

        (bool success, bytes memory returndata) = target.staticcall(data);
        return verifyCallResult(success, returndata, errorMessage);
    }

    function functionDelegateCall(address target, bytes memory data) internal returns (bytes memory) {
        return functionDelegateCall(target, data, "Address: low-level delegate call failed");
    }

    function functionDelegateCall(
        address target,
        bytes memory data,
        string memory errorMessage
    ) internal returns (bytes memory) {
        require(isContract(target), "Address: delegate call to non-contract");

        (bool success, bytes memory returndata) = target.delegatecall(data);
        return verifyCallResult(success, returndata, errorMessage);
    }

    function verifyCallResult(
        bool success,
        bytes memory returndata,
        string memory errorMessage
    ) internal pure returns (bytes memory) {
        if (success) {
            return returndata;
        } else {

            if (returndata.length > 0) {

                assembly {
                    let returndata_size := mload(returndata)
                    revert(add(32, returndata), returndata_size)
                }
            } else {
                revert(errorMessage);
            }
        }
    }
}

abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }
}

abstract contract ERC20 {

    event Transfer(address indexed from, address indexed to, uint256 amount);

    event Approval(address indexed owner, address indexed spender, uint256 amount);

    string public name;

    string public symbol;

    uint8 public immutable decimals;

    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;

    mapping(address => mapping(address => uint256)) public allowance;

    uint256 internal immutable INITIAL_CHAIN_ID;

    bytes32 internal immutable INITIAL_DOMAIN_SEPARATOR;

    mapping(address => uint256) public nonces;

    constructor(
        string memory _name,
        string memory _symbol,
        uint8 _decimals
    ) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;

        INITIAL_CHAIN_ID = block.chainid;
        INITIAL_DOMAIN_SEPARATOR = computeDomainSeparator();
    }

    function approve(address spender, uint256 amount) public virtual returns (bool) {
        allowance[msg.sender][spender] = amount;

        emit Approval(msg.sender, spender, amount);

        return true;
    }

    function transfer(address to, uint256 amount) public virtual returns (bool) {
        balanceOf[msg.sender] -= amount;

        unchecked {
            balanceOf[to] += amount;
        }

        emit Transfer(msg.sender, to, amount);

        return true;
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public virtual returns (bool) {
        uint256 allowed = allowance[from][msg.sender];

        if (allowed != type(uint256).max) allowance[from][msg.sender] = allowed - amount;

        balanceOf[from] -= amount;

        unchecked {
            balanceOf[to] += amount;
        }

        emit Transfer(from, to, amount);

        return true;
    }

    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public virtual {
        require(deadline >= block.timestamp, "PERMIT_DEADLINE_EXPIRED");

        unchecked {
            address recoveredAddress = ecrecover(
                keccak256(
                    abi.encodePacked(
                        "\x19\x01",
                        DOMAIN_SEPARATOR(),
                        keccak256(
                            abi.encode(
                                keccak256(
                                    "Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"
                                ),
                                owner,
                                spender,
                                value,
                                nonces[owner]++,
                                deadline
                            )
                        )
                    )
                ),
                v,
                r,
                s
            );

            require(recoveredAddress != address(0) && recoveredAddress == owner, "INVALID_SIGNER");

            allowance[recoveredAddress][spender] = value;
        }

        emit Approval(owner, spender, value);
    }

    function DOMAIN_SEPARATOR() public view virtual returns (bytes32) {
        return block.chainid == INITIAL_CHAIN_ID ? INITIAL_DOMAIN_SEPARATOR : computeDomainSeparator();
    }

    function computeDomainSeparator() internal view virtual returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                    keccak256(bytes(name)),
                    keccak256("1"),
                    block.chainid,
                    address(this)
                )
            );
    }

    function _mint(address to, uint256 amount) internal virtual {
        totalSupply += amount;

        unchecked {
            balanceOf[to] += amount;
        }

        emit Transfer(address(0), to, amount);
    }

    function _burn(address from, uint256 amount) internal virtual {
        balanceOf[from] -= amount;

        unchecked {
            totalSupply -= amount;
        }

        emit Transfer(from, address(0), amount);
    }
}

abstract contract ERC721 {

    event Transfer(address indexed from, address indexed to, uint256 indexed id);

    event Approval(address indexed owner, address indexed spender, uint256 indexed id);

    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

    string public name;

    string public symbol;

    function tokenURI(uint256 id) public view virtual returns (string memory);

    mapping(uint256 => address) internal _ownerOf;

    mapping(address => uint256) internal _balanceOf;

    function ownerOf(uint256 id) public view virtual returns (address owner) {
        require((owner = _ownerOf[id]) != address(0), "NOT_MINTED");
    }

    function balanceOf(address owner) public view virtual returns (uint256) {
        require(owner != address(0), "ZERO_ADDRESS");

        return _balanceOf[owner];
    }

    mapping(uint256 => address) public getApproved;

    mapping(address => mapping(address => bool)) public isApprovedForAll;

    constructor(string memory _name, string memory _symbol) {
        name = _name;
        symbol = _symbol;
    }

    function approve(address spender, uint256 id) public virtual {
        address owner = _ownerOf[id];

        require(msg.sender == owner || isApprovedForAll[owner][msg.sender], "NOT_AUTHORIZED");

        getApproved[id] = spender;

        emit Approval(owner, spender, id);
    }

    function setApprovalForAll(address operator, bool approved) public virtual {
        isApprovedForAll[msg.sender][operator] = approved;

        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function transferFrom(
        address from,
        address to,
        uint256 id
    ) public virtual {
        require(from == _ownerOf[id], "WRONG_FROM");

        require(to != address(0), "INVALID_RECIPIENT");

        require(
            msg.sender == from || isApprovedForAll[from][msg.sender] || msg.sender == getApproved[id],
            "NOT_AUTHORIZED"
        );

        unchecked {
            _balanceOf[from]--;

            _balanceOf[to]++;
        }

        _ownerOf[id] = to;

        delete getApproved[id];

        emit Transfer(from, to, id);
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 id
    ) public virtual {
        transferFrom(from, to, id);

        require(
            to.code.length == 0 ||
                ERC721TokenReceiver(to).onERC721Received(msg.sender, from, id, "") ==
                ERC721TokenReceiver.onERC721Received.selector,
            "UNSAFE_RECIPIENT"
        );
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        bytes calldata data
    ) public virtual {
        transferFrom(from, to, id);

        require(
            to.code.length == 0 ||
                ERC721TokenReceiver(to).onERC721Received(msg.sender, from, id, data) ==
                ERC721TokenReceiver.onERC721Received.selector,
            "UNSAFE_RECIPIENT"
        );
    }

    function supportsInterface(bytes4 interfaceId) public view virtual returns (bool) {
        return
            interfaceId == 0x01ffc9a7 ||
            interfaceId == 0x80ac58cd ||
            interfaceId == 0x5b5e139f;
    }

    function _mint(address to, uint256 id) internal virtual {
        require(to != address(0), "INVALID_RECIPIENT");

        require(_ownerOf[id] == address(0), "ALREADY_MINTED");

        unchecked {
            _balanceOf[to]++;
        }

        _ownerOf[id] = to;

        emit Transfer(address(0), to, id);
    }

    function _burn(uint256 id) internal virtual {
        address owner = _ownerOf[id];

        require(owner != address(0), "NOT_MINTED");

        unchecked {
            _balanceOf[owner]--;
        }

        delete _ownerOf[id];

        delete getApproved[id];

        emit Transfer(owner, address(0), id);
    }

    function _safeMint(address to, uint256 id) internal virtual {
        _mint(to, id);

        require(
            to.code.length == 0 ||
                ERC721TokenReceiver(to).onERC721Received(msg.sender, address(0), id, "") ==
                ERC721TokenReceiver.onERC721Received.selector,
            "UNSAFE_RECIPIENT"
        );
    }

    function _safeMint(
        address to,
        uint256 id,
        bytes memory data
    ) internal virtual {
        _mint(to, id);

        require(
            to.code.length == 0 ||
                ERC721TokenReceiver(to).onERC721Received(msg.sender, address(0), id, data) ==
                ERC721TokenReceiver.onERC721Received.selector,
            "UNSAFE_RECIPIENT"
        );
    }
}

abstract contract ERC721TokenReceiver {
    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external virtual returns (bytes4) {
        return ERC721TokenReceiver.onERC721Received.selector;
    }
}

interface IERC1271 {

    function isValidSignature(bytes32 hash, bytes memory signature) external view returns (bytes4 magicValue);
}

interface IWETH {
    event Approval(address indexed src, address indexed guy, uint256 wad);
    event Transfer(address indexed src, address indexed dst, uint256 wad);
    event Deposit(address indexed dst, uint256 wad);
    event Withdrawal(address indexed src, uint256 wad);

    function deposit() external payable;

    function withdraw(uint256 wad) external;

    function totalSupply() external view returns (uint256);

    function approve(address guy, uint256 wad) external returns (bool);

    function transfer(address dst, uint256 wad) external returns (bool);

    function transferFrom(
        address src,
        address dst,
        uint256 wad
    ) external returns (bool);
}

library Strings {
    bytes16 private constant _HEX_SYMBOLS = "0123456789abcdef";
    uint8 private constant _ADDRESS_LENGTH = 20;

    function toString(uint256 value) internal pure returns (string memory) {

        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }

    function toHexString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0x00";
        }
        uint256 temp = value;
        uint256 length = 0;
        while (temp != 0) {
            length++;
            temp >>= 8;
        }
        return toHexString(value, length);
    }

    function toHexString(uint256 value, uint256 length) internal pure returns (string memory) {
        bytes memory buffer = new bytes(2 * length + 2);
        buffer[0] = "0";
        buffer[1] = "x";
        for (uint256 i = 2 * length + 1; i > 1; --i) {
            buffer[i] = _HEX_SYMBOLS[value & 0xf];
            value >>= 4;
        }
        require(value == 0, "Strings: hex length insufficient");
        return string(buffer);
    }

    function toHexString(address addr) internal pure returns (string memory) {
        return toHexString(uint256(uint160(addr)), _ADDRESS_LENGTH);
    }
}

library ECDSA {
    enum RecoverError {
        NoError,
        InvalidSignature,
        InvalidSignatureLength,
        InvalidSignatureS,
        InvalidSignatureV
    }

    function _throwError(RecoverError error) private pure {
        if (error == RecoverError.NoError) {
            return;
        } else if (error == RecoverError.InvalidSignature) {
            revert("ECDSA: invalid signature");
        } else if (error == RecoverError.InvalidSignatureLength) {
            revert("ECDSA: invalid signature length");
        } else if (error == RecoverError.InvalidSignatureS) {
            revert("ECDSA: invalid signature 's' value");
        } else if (error == RecoverError.InvalidSignatureV) {
            revert("ECDSA: invalid signature 'v' value");
        }
    }

    function tryRecover(bytes32 hash, bytes memory signature) internal pure returns (address, RecoverError) {

        if (signature.length == 65) {
            bytes32 r;
            bytes32 s;
            uint8 v;

            assembly {
                r := mload(add(signature, 0x20))
                s := mload(add(signature, 0x40))
                v := byte(0, mload(add(signature, 0x60)))
            }
            return tryRecover(hash, v, r, s);
        } else if (signature.length == 64) {
            bytes32 r;
            bytes32 vs;

            assembly {
                r := mload(add(signature, 0x20))
                vs := mload(add(signature, 0x40))
            }
            return tryRecover(hash, r, vs);
        } else {
            return (address(0), RecoverError.InvalidSignatureLength);
        }
    }

    function recover(bytes32 hash, bytes memory signature) internal pure returns (address) {
        (address recovered, RecoverError error) = tryRecover(hash, signature);
        _throwError(error);
        return recovered;
    }

    function tryRecover(
        bytes32 hash,
        bytes32 r,
        bytes32 vs
    ) internal pure returns (address, RecoverError) {
        bytes32 s = vs & bytes32(0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff);
        uint8 v = uint8((uint256(vs) >> 255) + 27);
        return tryRecover(hash, v, r, s);
    }

    function recover(
        bytes32 hash,
        bytes32 r,
        bytes32 vs
    ) internal pure returns (address) {
        (address recovered, RecoverError error) = tryRecover(hash, r, vs);
        _throwError(error);
        return recovered;
    }

    function tryRecover(
        bytes32 hash,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) internal pure returns (address, RecoverError) {

        if (uint256(s) > 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0) {
            return (address(0), RecoverError.InvalidSignatureS);
        }
        if (v != 27 && v != 28) {
            return (address(0), RecoverError.InvalidSignatureV);
        }

        address signer = ecrecover(hash, v, r, s);
        if (signer == address(0)) {
            return (address(0), RecoverError.InvalidSignature);
        }

        return (signer, RecoverError.NoError);
    }

    function recover(
        bytes32 hash,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) internal pure returns (address) {
        (address recovered, RecoverError error) = tryRecover(hash, v, r, s);
        _throwError(error);
        return recovered;
    }

    function toEthSignedMessageHash(bytes32 hash) internal pure returns (bytes32) {

        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));
    }

    function toEthSignedMessageHash(bytes memory s) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n", Strings.toString(s.length), s));
    }

    function toTypedDataHash(bytes32 domainSeparator, bytes32 structHash) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
    }
}

abstract contract Ownable is Context {
    address private _owner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    constructor() {
        _transferOwnership(_msgSender());
    }

    function owner() public view virtual returns (address) {
        return _owner;
    }

    modifier onlyOwner() {
        require(owner() == _msgSender(), "Ownable: caller is not the owner");
        _;
    }

    function renounceOwnership() public virtual onlyOwner {
        _transferOwnership(address(0));
    }

    function transferOwnership(address newOwner) public virtual onlyOwner {
        require(newOwner != address(0), "Ownable: new owner is the zero address");
        _transferOwnership(newOwner);
    }

    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}

library SafeTransferLib {

    function safeTransferETH(address to, uint256 amount) internal {
        bool success;

        assembly {

            success := call(gas(), to, amount, 0, 0, 0, 0)
        }

        require(success, "ETH_TRANSFER_FAILED");
    }

    function safeTransferFrom(
        ERC20 token,
        address from,
        address to,
        uint256 amount
    ) internal {
        bool success;

        assembly {

            let freeMemoryPointer := mload(0x40)

            mstore(freeMemoryPointer, 0x23b872dd00000000000000000000000000000000000000000000000000000000)
            mstore(add(freeMemoryPointer, 4), from)
            mstore(add(freeMemoryPointer, 36), to)
            mstore(add(freeMemoryPointer, 68), amount)

            success := and(

                or(and(eq(mload(0), 1), gt(returndatasize(), 31)), iszero(returndatasize())),

                call(gas(), token, 0, freeMemoryPointer, 100, 0, 32)
            )
        }

        require(success, "TRANSFER_FROM_FAILED");
    }

    function safeTransfer(
        ERC20 token,
        address to,
        uint256 amount
    ) internal {
        bool success;

        assembly {

            let freeMemoryPointer := mload(0x40)

            mstore(freeMemoryPointer, 0xa9059cbb00000000000000000000000000000000000000000000000000000000)
            mstore(add(freeMemoryPointer, 4), to)
            mstore(add(freeMemoryPointer, 36), amount)

            success := and(

                or(and(eq(mload(0), 1), gt(returndatasize(), 31)), iszero(returndatasize())),

                call(gas(), token, 0, freeMemoryPointer, 68, 0, 32)
            )
        }

        require(success, "TRANSFER_FAILED");
    }

    function safeApprove(
        ERC20 token,
        address to,
        uint256 amount
    ) internal {
        bool success;

        assembly {

            let freeMemoryPointer := mload(0x40)

            mstore(freeMemoryPointer, 0x095ea7b300000000000000000000000000000000000000000000000000000000)
            mstore(add(freeMemoryPointer, 4), to)
            mstore(add(freeMemoryPointer, 36), amount)

            success := and(

                or(and(eq(mload(0), 1), gt(returndatasize(), 31)), iszero(returndatasize())),

                call(gas(), token, 0, freeMemoryPointer, 68, 0, 32)
            )
        }

        require(success, "APPROVE_FAILED");
    }
}

abstract contract PuttyV2Nft is ERC721("Putty", "OPUT") {

    function _mint(address to, uint256 id) internal override {
        require(to != address(0), "INVALID_RECIPIENT");
        require(_ownerOf[id] == address(0), "ALREADY_MINTED");

        _ownerOf[id] = to;

        emit Transfer(address(0), to, id);
    }

    function transferFrom(
        address from,
        address to,
        uint256 id
    ) public override {
        require(from == _ownerOf[id], "WRONG_FROM");
        require(to != address(0), "INVALID_RECIPIENT");
        require(
            msg.sender == from || isApprovedForAll[from][msg.sender] || msg.sender == getApproved[id],
            "NOT_AUTHORIZED"
        );

        _ownerOf[id] = to;
        delete getApproved[id];

        emit Transfer(from, to, id);
    }

    function balanceOf(address owner) public pure override returns (uint256) {
        require(owner != address(0), "ZERO_ADDRESS");
        return type(uint256).max;
    }
}

abstract contract EIP712 {

    bytes32 private immutable _CACHED_DOMAIN_SEPARATOR;
    uint256 private immutable _CACHED_CHAIN_ID;
    address private immutable _CACHED_THIS;

    bytes32 private immutable _HASHED_NAME;
    bytes32 private immutable _HASHED_VERSION;
    bytes32 private immutable _TYPE_HASH;

    constructor(string memory name, string memory version) {
        bytes32 hashedName = keccak256(bytes(name));
        bytes32 hashedVersion = keccak256(bytes(version));
        bytes32 typeHash = keccak256(
            "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
        );
        _HASHED_NAME = hashedName;
        _HASHED_VERSION = hashedVersion;
        _CACHED_CHAIN_ID = block.chainid;
        _CACHED_DOMAIN_SEPARATOR = _buildDomainSeparator(typeHash, hashedName, hashedVersion);
        _CACHED_THIS = address(this);
        _TYPE_HASH = typeHash;
    }

    function _domainSeparatorV4() internal view returns (bytes32) {
        if (address(this) == _CACHED_THIS && block.chainid == _CACHED_CHAIN_ID) {
            return _CACHED_DOMAIN_SEPARATOR;
        } else {
            return _buildDomainSeparator(_TYPE_HASH, _HASHED_NAME, _HASHED_VERSION);
        }
    }

    function _buildDomainSeparator(
        bytes32 typeHash,
        bytes32 nameHash,
        bytes32 versionHash
    ) private view returns (bytes32) {
        return keccak256(abi.encode(typeHash, nameHash, versionHash, block.chainid, address(this)));
    }

    function _hashTypedDataV4(bytes32 structHash) internal view virtual returns (bytes32) {
        return ECDSA.toTypedDataHash(_domainSeparatorV4(), structHash);
    }
}

library SignatureChecker {

    function isValidSignatureNow(
        address signer,
        bytes32 hash,
        bytes memory signature
    ) internal view returns (bool) {
        (address recovered, ECDSA.RecoverError error) = ECDSA.tryRecover(hash, signature);
        if (error == ECDSA.RecoverError.NoError && recovered == signer) {
            return true;
        }

        (bool success, bytes memory result) = signer.staticcall(
            abi.encodeWithSelector(IERC1271.isValidSignature.selector, hash, signature)
        );
        return (success && result.length == 32 && abi.decode(result, (bytes4)) == IERC1271.isValidSignature.selector);
    }
}

contract PuttyV2 is PuttyV2Nft, EIP712("Putty", "2.0"), ERC721TokenReceiver, Ownable {

    using SafeTransferLib for ERC20;

    struct ERC20Asset {
        address token;
        uint256 tokenAmount;
    }

    struct ERC721Asset {
        address token;
        uint256 tokenId;
    }

    struct Order {
        address maker;
        bool isCall;
        bool isLong;
        address baseAsset;
        uint256 strike;
        uint256 premium;
        uint256 duration;
        uint256 expiration;
        uint256 nonce;
        address[] whitelist;
        address[] floorTokens;
        ERC20Asset[] erc20Assets;
        ERC721Asset[] erc721Assets;
    }

    bytes32 public constant ERC721ASSET_TYPE_HASH =
        keccak256(abi.encodePacked("ERC721Asset(address token,uint256 tokenId)"));

    bytes32 public constant ERC20ASSET_TYPE_HASH =
        keccak256(abi.encodePacked("ERC20Asset(address token,uint256 tokenAmount)"));

    bytes32 public constant ORDER_TYPE_HASH =
        keccak256(
            abi.encodePacked(
                "Order(",
                "address maker,",
                "bool isCall,",
                "bool isLong,",
                "address baseAsset,",
                "uint256 strike,",
                "uint256 premium,",
                "uint256 duration,",
                "uint256 expiration,",
                "uint256 nonce,",
                "address[] whitelist,",
                "address[] floorTokens,",
                "ERC20Asset[] erc20Assets,",
                "ERC721Asset[] erc721Assets",
                ")",
                "ERC20Asset(address token,uint256 tokenAmount)",
                "ERC721Asset(address token,uint256 tokenId)"
            )
        );

    address public immutable weth;

    string public baseURI;

    uint256 public fee;

    mapping(bytes32 => bool) public cancelledOrders;

    mapping(uint256 => uint256) public positionExpirations;

    mapping(uint256 => bool) public exercisedPositions;

    mapping(uint256 => uint256[]) public positionFloorAssetTokenIds;

    mapping(address => uint256) public unclaimedFees;

    event NewBaseURI(string baseURI);

    event NewFee(uint256 fee);

    event WithdrewFees(address indexed asset, uint256 fees, address recipient);

    event FilledOrder(bytes32 indexed orderHash, uint256[] floorAssetTokenIds, Order order);

    event ExercisedOrder(bytes32 indexed orderHash, uint256[] floorAssetTokenIds, Order order);

    event WithdrawOrder(bytes32 indexed orderHash, Order order);

    event CancelledOrder(bytes32 indexed orderHash, Order order);

    constructor(
        string memory _baseURI,
        uint256 _fee,
        address _weth
    ) {
        require(_weth != address(0), "Unset weth address");

        setBaseURI(_baseURI);
        setFee(_fee);
        weth = _weth;
    }

    function setBaseURI(string memory _baseURI) public payable onlyOwner {
        baseURI = _baseURI;

        emit NewBaseURI(_baseURI);
    }

    function setFee(uint256 _fee) public payable onlyOwner {
        require(_fee < 30, "fee must be less than 3%");

        fee = _fee;

        emit NewFee(_fee);
    }

    function withdrawFees(address asset, address recipient) public payable onlyOwner {
        uint256 fees = unclaimedFees[asset];

        unclaimedFees[asset] = 0;

        emit WithdrewFees(asset, fees, recipient);

        ERC20(asset).transfer(recipient, fees);
    }

    function fillOrder(
        Order memory order,
        bytes calldata signature,
        uint256[] memory floorAssetTokenIds
    ) public payable returns (uint256 positionId) {

        bytes32 orderHash = hashOrder(order);

        require(SignatureChecker.isValidSignatureNow(order.maker, orderHash, signature), "Invalid signature");

        require(!cancelledOrders[orderHash], "Order has been cancelled");

        require(order.whitelist.length == 0 || isWhitelisted(order.whitelist, msg.sender), "Not whitelisted");

        require(order.duration < 10_000 days, "Duration too long");

        require(block.timestamp < order.expiration, "Order has expired");

        require(order.baseAsset.code.length > 0, "baseAsset is not contract");

        order.isCall && order.isLong
            ? require(floorAssetTokenIds.length == order.floorTokens.length, "Wrong amount of floor tokenIds")
            : require(floorAssetTokenIds.length == 0, "Invalid floor tokens length");

        _mint(order.maker, uint256(orderHash));

        bytes32 oppositeOrderHash = hashOppositeOrder(order);
        positionId = uint256(oppositeOrderHash);
        _mint(msg.sender, positionId);

        if (order.isLong && order.isCall) {
            positionFloorAssetTokenIds[uint256(orderHash)] = floorAssetTokenIds;
        }

        positionExpirations[order.isLong ? uint256(orderHash) : positionId] = block.timestamp + order.duration;

        emit FilledOrder(orderHash, floorAssetTokenIds, order);

        uint256 feeAmount = 0;
        if (fee > 0) {
            feeAmount = (order.premium * fee) / 1000;
            unclaimedFees[order.baseAsset] += feeAmount;
        }

        if (order.isLong) {

            ERC20(order.baseAsset).safeTransferFrom(order.maker, msg.sender, order.premium - feeAmount);

            if (feeAmount > 0) {
                ERC20(order.baseAsset).safeTransferFrom(order.maker, address(this), feeAmount);
            }
        } else {

            if (weth == order.baseAsset && msg.value > 0) {

                require(msg.value == order.premium, "Incorrect ETH amount sent");

                IWETH(weth).deposit{value: order.premium}();

                IWETH(weth).transfer(order.maker, order.premium - feeAmount);
            } else {

                ERC20(order.baseAsset).safeTransferFrom(msg.sender, order.maker, order.premium - feeAmount);

                if (feeAmount > 0) {
                    ERC20(order.baseAsset).safeTransferFrom(msg.sender, address(this), feeAmount);
                }            }
        }

        if (!order.isLong && !order.isCall) {
            ERC20(order.baseAsset).safeTransferFrom(order.maker, address(this), order.strike);
            return positionId;
        }

        if (order.isLong && !order.isCall) {

            if (weth == order.baseAsset && msg.value > 0) {

                require(msg.value == order.strike, "Incorrect ETH amount sent");

                IWETH(weth).deposit{value: msg.value}();
            } else {
                ERC20(order.baseAsset).safeTransferFrom(msg.sender, address(this), order.strike);
            }

            return positionId;
        }

        if (!order.isLong && order.isCall) {
            _transferERC20sIn(order.erc20Assets, order.maker);
            _transferERC721sIn(order.erc721Assets, order.maker);
            return positionId;
        }

        if (order.isLong && order.isCall) {
            _transferERC20sIn(order.erc20Assets, msg.sender);
            _transferERC721sIn(order.erc721Assets, msg.sender);
            _transferFloorsIn(order.floorTokens, floorAssetTokenIds, msg.sender);
            return positionId;
        }
    }

    function exercise(Order memory order, uint256[] calldata floorAssetTokenIds) public payable {

        bytes32 orderHash = hashOrder(order);

        require(ownerOf(uint256(orderHash)) == msg.sender, "Not owner");

        require(order.isLong, "Can only exercise long positions");

        require(block.timestamp < positionExpirations[uint256(orderHash)], "Position has expired");

        !order.isCall
            ? require(floorAssetTokenIds.length == order.floorTokens.length, "Wrong amount of floor tokenIds")
            : require(floorAssetTokenIds.length == 0, "Invalid floor tokenIds length");

        transferFrom(msg.sender, address(0xdead), uint256(orderHash));

        exercisedPositions[uint256(orderHash)] = true;

        emit ExercisedOrder(orderHash, floorAssetTokenIds, order);

        if (order.isCall) {

            if (weth == order.baseAsset && msg.value > 0) {

                require(msg.value == order.strike, "Incorrect ETH amount sent");

                IWETH(weth).deposit{value: msg.value}();
            } else {
                ERC20(order.baseAsset).safeTransferFrom(msg.sender, address(this), order.strike);
            }

            _transferERC20sOut(order.erc20Assets);
            _transferERC721sOut(order.erc721Assets);
            _transferFloorsOut(order.floorTokens, positionFloorAssetTokenIds[uint256(orderHash)]);
        } else {

            uint256 shortPositionId = uint256(hashOppositeOrder(order));
            positionFloorAssetTokenIds[shortPositionId] = floorAssetTokenIds;

            ERC20(order.baseAsset).safeTransfer(msg.sender, order.strike);

            _transferERC20sIn(order.erc20Assets, msg.sender);
            _transferERC721sIn(order.erc721Assets, msg.sender);
            _transferFloorsIn(order.floorTokens, floorAssetTokenIds, msg.sender);
        }
    }

    function withdraw(Order memory order) public {

        require(!order.isLong, "Must be short position");

        bytes32 orderHash = hashOrder(order);

        require(ownerOf(uint256(orderHash)) == msg.sender, "Not owner");

        uint256 longPositionId = uint256(hashOppositeOrder(order));
        bool isExercised = exercisedPositions[longPositionId];

        require(block.timestamp > positionExpirations[longPositionId] || isExercised, "Must be exercised or expired");

        transferFrom(msg.sender, address(0xdead), uint256(orderHash));

        emit WithdrawOrder(orderHash, order);

        if ((order.isCall && isExercised) || (!order.isCall && !isExercised)) {
            ERC20(order.baseAsset).safeTransfer(msg.sender, order.strike);
            return;
        }

        if ((order.isCall && !isExercised) || (!order.isCall && isExercised)) {
            _transferERC20sOut(order.erc20Assets);
            _transferERC721sOut(order.erc721Assets);

            uint256 floorPositionId = order.isCall ? longPositionId : uint256(orderHash);
            _transferFloorsOut(order.floorTokens, positionFloorAssetTokenIds[floorPositionId]);

            return;
        }
    }

    function cancel(Order memory order) public {
        require(msg.sender == order.maker, "Not your order");

        bytes32 orderHash = hashOrder(order);

        cancelledOrders[orderHash] = true;

        emit CancelledOrder(orderHash, order);
    }

    function batchFillOrder(
        Order[] memory orders,
        bytes[] calldata signatures,
        uint256[][] memory floorAssetTokenIds
    ) public returns (uint256[] memory positionIds) {
        require(orders.length == signatures.length, "Length mismatch in input");
        require(signatures.length == floorAssetTokenIds.length, "Length mismatch in input");

        positionIds = new uint256[](orders.length);

        for (uint256 i = 0; i < orders.length; i++) {
            positionIds[i] = fillOrder(orders[i], signatures[i], floorAssetTokenIds[i]);
        }
    }

    function acceptCounterOffer(
        Order memory order,
        bytes calldata signature,
        Order memory originalOrder
    ) public payable returns (uint256 positionId) {

        cancel(originalOrder);

        uint256[] memory floorAssetTokenIds = new uint256[](0);
        positionId = fillOrder(order, signature, floorAssetTokenIds);
    }

    function _transferERC20sIn(ERC20Asset[] memory assets, address from) internal {
        for (uint256 i = 0; i < assets.length; i++) {
            address token = assets[i].token;
            uint256 tokenAmount = assets[i].tokenAmount;

            require(token.code.length > 0, "ERC20: Token is not contract");
            require(tokenAmount > 0, "ERC20: Amount too small");

            ERC20(token).safeTransferFrom(from, address(this), tokenAmount);
        }
    }

    function _transferERC721sIn(ERC721Asset[] memory assets, address from) internal {
        for (uint256 i = 0; i < assets.length; i++) {
            ERC721(assets[i].token).safeTransferFrom(from, address(this), assets[i].tokenId);
        }
    }

    function _transferFloorsIn(
        address[] memory floorTokens,
        uint256[] memory floorTokenIds,
        address from
    ) internal {
        for (uint256 i = 0; i < floorTokens.length; i++) {
            ERC721(floorTokens[i]).safeTransferFrom(from, address(this), floorTokenIds[i]);
        }
    }

    function _transferERC20sOut(ERC20Asset[] memory assets) internal {
        for (uint256 i = 0; i < assets.length; i++) {
            ERC20(assets[i].token).safeTransfer(msg.sender, assets[i].tokenAmount);
        }
    }

    function _transferERC721sOut(ERC721Asset[] memory assets) internal {
        for (uint256 i = 0; i < assets.length; i++) {
            ERC721(assets[i].token).safeTransferFrom(address(this), msg.sender, assets[i].tokenId);
        }
    }

    function _transferFloorsOut(address[] memory floorTokens, uint256[] memory floorTokenIds) internal {
        for (uint256 i = 0; i < floorTokens.length; i++) {
            ERC721(floorTokens[i]).safeTransferFrom(address(this), msg.sender, floorTokenIds[i]);
        }
    }

    function isWhitelisted(address[] memory whitelist, address target) public pure returns (bool) {
        for (uint256 i = 0; i < whitelist.length; i++) {
            if (target == whitelist[i]) return true;
        }

        return false;
    }

    function hashOppositeOrder(Order memory order) public view returns (bytes32 orderHash) {

        Order memory oppositeOrder = abi.decode(abi.encode(order), (Order));

        oppositeOrder.isLong = !order.isLong;
        orderHash = hashOrder(oppositeOrder);
    }

    function hashOrder(Order memory order) public view returns (bytes32 orderHash) {
        orderHash = keccak256(
            abi.encode(
                ORDER_TYPE_HASH,
                order.maker,
                order.isCall,
                order.isLong,
                order.baseAsset,
                order.strike,
                order.premium,
                order.duration,
                order.expiration,
                order.nonce,
                keccak256(abi.encodePacked(order.whitelist)),
                keccak256(abi.encodePacked(order.floorTokens)),
                keccak256(encodeERC20Assets(order.erc20Assets)),
                keccak256(encodeERC721Assets(order.erc721Assets))
            )
        );

        orderHash = _hashTypedDataV4(orderHash);
    }

    function encodeERC20Assets(ERC20Asset[] memory arr) public pure returns (bytes memory encoded) {
        for (uint256 i = 0; i < arr.length; i++) {
            encoded = abi.encodePacked(
                encoded,
                keccak256(abi.encode(ERC20ASSET_TYPE_HASH, arr[i].token, arr[i].tokenAmount))
            );
        }
    }

    function encodeERC721Assets(ERC721Asset[] memory arr) public pure returns (bytes memory encoded) {
        for (uint256 i = 0; i < arr.length; i++) {
            encoded = abi.encodePacked(
                encoded,
                keccak256(abi.encode(ERC721ASSET_TYPE_HASH, arr[i].token, arr[i].tokenId))
            );
        }
    }

    function domainSeparatorV4() public view returns (bytes32) {
        return _domainSeparatorV4();
    }

    function tokenURI(uint256 id) public view override returns (string memory) {
        require(_ownerOf[id] != address(0), "URI query for NOT_MINTED token");

        return string.concat(baseURI, Strings.toString(id));
    }
}
