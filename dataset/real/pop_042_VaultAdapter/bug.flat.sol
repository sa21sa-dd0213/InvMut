// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;

library Address {

    error AddressInsufficientBalance(address account);

    error AddressEmptyCode(address target);

    error FailedInnerCall();

    function sendValue(address payable recipient, uint256 amount) internal {
        if (address(this).balance < amount) {
            revert AddressInsufficientBalance(address(this));
        }

        (bool success, ) = recipient.call{value: amount}("");
        if (!success) {
            revert FailedInnerCall();
        }
    }

    function functionCall(address target, bytes memory data) internal returns (bytes memory) {
        return functionCallWithValue(target, data, 0);
    }

    function functionCallWithValue(address target, bytes memory data, uint256 value) internal returns (bytes memory) {
        if (address(this).balance < value) {
            revert AddressInsufficientBalance(address(this));
        }
        (bool success, bytes memory returndata) = target.call{value: value}(data);
        return verifyCallResultFromTarget(target, success, returndata);
    }

    function functionStaticCall(address target, bytes memory data) internal view returns (bytes memory) {
        (bool success, bytes memory returndata) = target.staticcall(data);
        return verifyCallResultFromTarget(target, success, returndata);
    }

    function functionDelegateCall(address target, bytes memory data) internal returns (bytes memory) {
        (bool success, bytes memory returndata) = target.delegatecall(data);
        return verifyCallResultFromTarget(target, success, returndata);
    }

    function verifyCallResultFromTarget(
        address target,
        bool success,
        bytes memory returndata
    ) internal view returns (bytes memory) {
        if (!success) {
            _revert(returndata);
        } else {

            if (returndata.length == 0 && target.code.length == 0) {
                revert AddressEmptyCode(target);
            }
            return returndata;
        }
    }

    function verifyCallResult(bool success, bytes memory returndata) internal pure returns (bytes memory) {
        if (!success) {
            _revert(returndata);
        } else {
            return returndata;
        }
    }

    function _revert(bytes memory returndata) private pure {

        if (returndata.length > 0) {

            assembly {
                let returndata_size := mload(returndata)
                revert(add(32, returndata), returndata_size)
            }
        } else {
            revert FailedInnerCall();
        }
    }
}

library EnumerableSet {

    struct Set {

        bytes32[] _values;

        mapping(bytes32 value => uint256) _positions;
    }

    function _add(Set storage set, bytes32 value) private returns (bool) {
        if (!_contains(set, value)) {
            set._values.push(value);

            set._positions[value] = set._values.length;
            return true;
        } else {
            return false;
        }
    }

    function _remove(Set storage set, bytes32 value) private returns (bool) {

        uint256 position = set._positions[value];

        if (position != 0) {

            uint256 valueIndex = position - 1;
            uint256 lastIndex = set._values.length - 1;

            if (valueIndex != lastIndex) {
                bytes32 lastValue = set._values[lastIndex];

                set._values[valueIndex] = lastValue;

                set._positions[lastValue] = position;
            }

            set._values.pop();

            delete set._positions[value];

            return true;
        } else {
            return false;
        }
    }

    function _contains(Set storage set, bytes32 value) private view returns (bool) {
        return set._positions[value] != 0;
    }

    function _length(Set storage set) private view returns (uint256) {
        return set._values.length;
    }

    function _at(Set storage set, uint256 index) private view returns (bytes32) {
        return set._values[index];
    }

    function _values(Set storage set) private view returns (bytes32[] memory) {
        return set._values;
    }

    struct Bytes32Set {
        Set _inner;
    }

    function add(Bytes32Set storage set, bytes32 value) internal returns (bool) {
        return _add(set._inner, value);
    }

    function remove(Bytes32Set storage set, bytes32 value) internal returns (bool) {
        return _remove(set._inner, value);
    }

    function contains(Bytes32Set storage set, bytes32 value) internal view returns (bool) {
        return _contains(set._inner, value);
    }

    function length(Bytes32Set storage set) internal view returns (uint256) {
        return _length(set._inner);
    }

    function at(Bytes32Set storage set, uint256 index) internal view returns (bytes32) {
        return _at(set._inner, index);
    }

    function values(Bytes32Set storage set) internal view returns (bytes32[] memory) {
        bytes32[] memory store = _values(set._inner);
        bytes32[] memory result;

        assembly {
            result := store
        }

        return result;
    }

    struct AddressSet {
        Set _inner;
    }

    function add(AddressSet storage set, address value) internal returns (bool) {
        return _add(set._inner, bytes32(uint256(uint160(value))));
    }

    function remove(AddressSet storage set, address value) internal returns (bool) {
        return _remove(set._inner, bytes32(uint256(uint160(value))));
    }

    function contains(AddressSet storage set, address value) internal view returns (bool) {
        return _contains(set._inner, bytes32(uint256(uint160(value))));
    }

    function length(AddressSet storage set) internal view returns (uint256) {
        return _length(set._inner);
    }

    function at(AddressSet storage set, uint256 index) internal view returns (address) {
        return address(uint160(uint256(_at(set._inner, index))));
    }

    function values(AddressSet storage set) internal view returns (address[] memory) {
        bytes32[] memory store = _values(set._inner);
        address[] memory result;

        assembly {
            result := store
        }

        return result;
    }

    struct UintSet {
        Set _inner;
    }

    function add(UintSet storage set, uint256 value) internal returns (bool) {
        return _add(set._inner, bytes32(value));
    }

    function remove(UintSet storage set, uint256 value) internal returns (bool) {
        return _remove(set._inner, bytes32(value));
    }

    function contains(UintSet storage set, uint256 value) internal view returns (bool) {
        return _contains(set._inner, bytes32(value));
    }

    function length(UintSet storage set) internal view returns (uint256) {
        return _length(set._inner);
    }

    function at(UintSet storage set, uint256 index) internal view returns (uint256) {
        return uint256(_at(set._inner, index));
    }

    function values(UintSet storage set) internal view returns (uint256[] memory) {
        bytes32[] memory store = _values(set._inner);
        uint256[] memory result;

        assembly {
            result := store
        }

        return result;
    }
}

interface IAccess {

    struct AccessStorage {
        address accessControl;
    }

    error AccessDenied();
}

interface IAccessControl {

    error CannotRevokeSelf();

    function initialize(address _admin) external;

    function grantAccess(bytes4 _selector, address _contract, address _address) external;

    function revokeAccess(bytes4 _selector, address _contract, address _address) external;

    function checkAccess(bytes4 _selector, address _contract, address _caller) external view returns (bool hasAccess);

    function role(bytes4 _selector, address _contract) external pure returns (bytes32 roleId);
}

interface IBeacon {

    function implementation() external view returns (address);
}

interface IVaultAdapter {

    struct VaultAdapterStorage {
        mapping(address => SlopeData) slopeData;
        mapping(address => mapping(address => UtilizationData)) utilizationData;
        uint256 maxMultiplier;
        uint256 minMultiplier;
        uint256 rate;
    }

    struct SlopeData {
        uint256 kink;
        uint256 slope0;
        uint256 slope1;
    }

    struct UtilizationData {
        uint256 multiplier;
        uint256 index;
        uint256 lastUpdate;
    }

    event SetSlopes(address indexed _asset, SlopeData _slopes);

    event SetLimits(uint256 _maxMultiplier, uint256 _minMultiplier, uint256 _rate);

    error InvalidKink();

    function initialize(address _accessControl) external;

    function rate(address _vault, address _asset) external returns (uint256 latestAnswer);

    function setSlopes(address _asset, SlopeData memory _slopes) external;

    function setLimits(uint256 _maxMultiplier, uint256 _minMultiplier, uint256 _rate) external;
}

abstract contract Initializable {

    struct InitializableStorage {

        uint64 _initialized;

        bool _initializing;
    }

    bytes32 private constant INITIALIZABLE_STORAGE = 0xf0c57e16840df040f15088dc2f81fe391c3923bec73e23a9662efc9c229c6a00;

    error InvalidInitialization();

    error NotInitializing();

    event Initialized(uint64 version);

    modifier initializer() {

        InitializableStorage storage $ = _getInitializableStorage();

        bool isTopLevelCall = !$._initializing;
        uint64 initialized = $._initialized;

        bool initialSetup = initialized == 0 && isTopLevelCall;
        bool construction = initialized == 1 && address(this).code.length == 0;

        if (!initialSetup && !construction) {
            revert InvalidInitialization();
        }
        $._initialized = 1;
        if (isTopLevelCall) {
            $._initializing = true;
        }
        _;
        if (isTopLevelCall) {
            $._initializing = false;
            emit Initialized(1);
        }
    }

    modifier reinitializer(uint64 version) {

        InitializableStorage storage $ = _getInitializableStorage();

        if ($._initializing || $._initialized >= version) {
            revert InvalidInitialization();
        }
        $._initialized = version;
        $._initializing = true;
        _;
        $._initializing = false;
        emit Initialized(version);
    }

    modifier onlyInitializing() {
        _checkInitializing();
        _;
    }

    function _checkInitializing() internal view virtual {
        if (!_isInitializing()) {
            revert NotInitializing();
        }
    }

    function _disableInitializers() internal virtual {

        InitializableStorage storage $ = _getInitializableStorage();

        if ($._initializing) {
            revert InvalidInitialization();
        }
        if ($._initialized != type(uint64).max) {
            $._initialized = type(uint64).max;
            emit Initialized(type(uint64).max);
        }
    }

    function _getInitializedVersion() internal view returns (uint64) {
        return _getInitializableStorage()._initialized;
    }

    function _isInitializing() internal view returns (bool) {
        return _getInitializableStorage()._initializing;
    }

    function _getInitializableStorage() private pure returns (InitializableStorage storage $) {
        assembly {
            $.slot := INITIALIZABLE_STORAGE
        }
    }
}

library StorageSlot {
    struct AddressSlot {
        address value;
    }

    struct BooleanSlot {
        bool value;
    }

    struct Bytes32Slot {
        bytes32 value;
    }

    struct Uint256Slot {
        uint256 value;
    }

    struct StringSlot {
        string value;
    }

    struct BytesSlot {
        bytes value;
    }

    function getAddressSlot(bytes32 slot) internal pure returns (AddressSlot storage r) {

        assembly {
            r.slot := slot
        }
    }

    function getBooleanSlot(bytes32 slot) internal pure returns (BooleanSlot storage r) {

        assembly {
            r.slot := slot
        }
    }

    function getBytes32Slot(bytes32 slot) internal pure returns (Bytes32Slot storage r) {

        assembly {
            r.slot := slot
        }
    }

    function getUint256Slot(bytes32 slot) internal pure returns (Uint256Slot storage r) {

        assembly {
            r.slot := slot
        }
    }

    function getStringSlot(bytes32 slot) internal pure returns (StringSlot storage r) {

        assembly {
            r.slot := slot
        }
    }

    function getStringSlot(string storage store) internal pure returns (StringSlot storage r) {

        assembly {
            r.slot := store.slot
        }
    }

    function getBytesSlot(bytes32 slot) internal pure returns (BytesSlot storage r) {

        assembly {
            r.slot := slot
        }
    }

    function getBytesSlot(bytes storage store) internal pure returns (BytesSlot storage r) {

        assembly {
            r.slot := store.slot
        }
    }
}

interface IERC1822Proxiable {

    function proxiableUUID() external view returns (bytes32);
}

abstract contract AccessStorageUtils {

    bytes32 private constant AccessStorageLocation = 0xb413d65cb88f23816c329284a0d3eb15a99df7963ab7402ade4c5da22bff6b00;

    function getAccessStorage() internal pure returns (IAccess.AccessStorage storage $) {
        assembly {
            $.slot := AccessStorageLocation
        }
    }
}

interface IVault {

    struct VaultStorage {
        EnumerableSet.AddressSet assets;
        mapping(address => uint256) totalSupplies;
        mapping(address => uint256) totalBorrows;
        mapping(address => uint256) utilizationIndex;
        mapping(address => uint256) lastUpdate;
        mapping(address => bool) paused;
        address insuranceFund;
    }

    struct MintBurnParams {
        address asset;
        uint256 amountIn;
        uint256 amountOut;
        uint256 minAmountOut;
        address receiver;
        uint256 deadline;
        uint256 fee;
    }

    struct RedeemParams {
        uint256 amountIn;
        uint256[] amountsOut;
        uint256[] minAmountsOut;
        address receiver;
        uint256 deadline;
        uint256[] fees;
    }

    struct BorrowParams {
        address asset;
        uint256 amount;
        address receiver;
    }

    struct RepayParams {
        address asset;
        uint256 amount;
    }

    function mint(address _asset, uint256 _amountIn, uint256 _minAmountOut, address _receiver, uint256 _deadline)
        external
        returns (uint256 amountOut);

    function burn(address _asset, uint256 _amountIn, uint256 _minAmountOut, address _receiver, uint256 _deadline)
        external
        returns (uint256 amountOut);

    function redeem(uint256 _amountIn, uint256[] calldata _minAmountsOut, address _receiver, uint256 _deadline)
        external
        returns (uint256[] memory amountsOut);

    function borrow(address _asset, uint256 _amount, address _receiver) external;

    function repay(address _asset, uint256 _amount) external;

    function addAsset(address _asset) external;

    function removeAsset(address _asset) external;

    function pauseAsset(address _asset) external;

    function unpauseAsset(address _asset) external;

    function pauseProtocol() external;

    function unpauseProtocol() external;

    function setInsuranceFund(address _insuranceFund) external;

    function rescueERC20(address _asset, address _receiver) external;

    function assets() external view returns (address[] memory assetList);

    function totalSupplies(address _asset) external view returns (uint256 totalSupply);

    function totalBorrows(address _asset) external view returns (uint256 totalBorrow);

    function paused(address _asset) external view returns (bool isPaused);

    function availableBalance(address _asset) external view returns (uint256 amount);

    function utilization(address _asset) external view returns (uint256 ratio);

    function currentUtilizationIndex(address _asset) external view returns (uint256 index);

    function insuranceFund() external view returns (address);
}

abstract contract VaultAdapterStorageUtils {

    bytes32 constant VaultAdapterStorageLocation = 0x2b1d5d801322d1007f654ac87d8072a5f5ca4203517edc869ef2aa54addad600;

    function getVaultAdapterStorage() internal pure returns (IVaultAdapter.VaultAdapterStorage storage $) {
        assembly {
            $.slot := VaultAdapterStorageLocation
        }
    }
}

library ERC1967Utils {

    event Upgraded(address indexed implementation);

    event AdminChanged(address previousAdmin, address newAdmin);

    event BeaconUpgraded(address indexed beacon);

    bytes32 internal constant IMPLEMENTATION_SLOT = 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;

    error ERC1967InvalidImplementation(address implementation);

    error ERC1967InvalidAdmin(address admin);

    error ERC1967InvalidBeacon(address beacon);

    error ERC1967NonPayable();

    function getImplementation() internal view returns (address) {
        return StorageSlot.getAddressSlot(IMPLEMENTATION_SLOT).value;
    }

    function _setImplementation(address newImplementation) private {
        if (newImplementation.code.length == 0) {
            revert ERC1967InvalidImplementation(newImplementation);
        }
        StorageSlot.getAddressSlot(IMPLEMENTATION_SLOT).value = newImplementation;
    }

    function upgradeToAndCall(address newImplementation, bytes memory data) internal {
        _setImplementation(newImplementation);
        emit Upgraded(newImplementation);

        if (data.length > 0) {
            Address.functionDelegateCall(newImplementation, data);
        } else {
            _checkNonPayable();
        }
    }

    bytes32 internal constant ADMIN_SLOT = 0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103;

    function getAdmin() internal view returns (address) {
        return StorageSlot.getAddressSlot(ADMIN_SLOT).value;
    }

    function _setAdmin(address newAdmin) private {
        if (newAdmin == address(0)) {
            revert ERC1967InvalidAdmin(address(0));
        }
        StorageSlot.getAddressSlot(ADMIN_SLOT).value = newAdmin;
    }

    function changeAdmin(address newAdmin) internal {
        emit AdminChanged(getAdmin(), newAdmin);
        _setAdmin(newAdmin);
    }

    bytes32 internal constant BEACON_SLOT = 0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50;

    function getBeacon() internal view returns (address) {
        return StorageSlot.getAddressSlot(BEACON_SLOT).value;
    }

    function _setBeacon(address newBeacon) private {
        if (newBeacon.code.length == 0) {
            revert ERC1967InvalidBeacon(newBeacon);
        }

        StorageSlot.getAddressSlot(BEACON_SLOT).value = newBeacon;

        address beaconImplementation = IBeacon(newBeacon).implementation();
        if (beaconImplementation.code.length == 0) {
            revert ERC1967InvalidImplementation(beaconImplementation);
        }
    }

    function upgradeBeaconToAndCall(address newBeacon, bytes memory data) internal {
        _setBeacon(newBeacon);
        emit BeaconUpgraded(newBeacon);

        if (data.length > 0) {
            Address.functionDelegateCall(IBeacon(newBeacon).implementation(), data);
        } else {
            _checkNonPayable();
        }
    }

    function _checkNonPayable() private {
        if (msg.value > 0) {
            revert ERC1967NonPayable();
        }
    }
}

abstract contract Access is IAccess, Initializable, AccessStorageUtils {

    modifier checkAccess(bytes4 _selector) {
        _checkAccess(_selector);
        _;
    }

    function __Access_init(address _accessControl) internal onlyInitializing {
        __Access_init_unchained(_accessControl);
    }

    function __Access_init_unchained(address _accessControl) internal onlyInitializing {
        getAccessStorage().accessControl = _accessControl;
    }

    function _checkAccess(bytes4 _selector) internal view {
        bool hasAccess =
            IAccessControl(getAccessStorage().accessControl).checkAccess(_selector, address(this), msg.sender);
        if (!hasAccess) revert AccessDenied();
    }
}

abstract contract UUPSUpgradeable is Initializable, IERC1822Proxiable {

    address private immutable __self = address(this);

    string public constant UPGRADE_INTERFACE_VERSION = "5.0.0";

    error UUPSUnauthorizedCallContext();

    error UUPSUnsupportedProxiableUUID(bytes32 slot);

    modifier onlyProxy() {
        _checkProxy();
        _;
    }

    modifier notDelegated() {
        _checkNotDelegated();
        _;
    }

    function __UUPSUpgradeable_init() internal onlyInitializing {
    }

    function __UUPSUpgradeable_init_unchained() internal onlyInitializing {
    }

    function proxiableUUID() external view virtual notDelegated returns (bytes32) {
        return ERC1967Utils.IMPLEMENTATION_SLOT;
    }

    function upgradeToAndCall(address newImplementation, bytes memory data) public payable virtual onlyProxy {
        _authorizeUpgrade(newImplementation);
        _upgradeToAndCallUUPS(newImplementation, data);
    }

    function _checkProxy() internal view virtual {
        if (
            address(this) == __self ||
            ERC1967Utils.getImplementation() != __self
        ) {
            revert UUPSUnauthorizedCallContext();
        }
    }

    function _checkNotDelegated() internal view virtual {
        if (address(this) != __self) {

            revert UUPSUnauthorizedCallContext();
        }
    }

    function _authorizeUpgrade(address newImplementation) internal virtual;

    function _upgradeToAndCallUUPS(address newImplementation, bytes memory data) private {
        try IERC1822Proxiable(newImplementation).proxiableUUID() returns (bytes32 slot) {
            if (slot != ERC1967Utils.IMPLEMENTATION_SLOT) {
                revert UUPSUnsupportedProxiableUUID(slot);
            }
            ERC1967Utils.upgradeToAndCall(newImplementation, data);
        } catch {

            revert ERC1967Utils.ERC1967InvalidImplementation(newImplementation);
        }
    }
}

contract VaultAdapter is IVaultAdapter, UUPSUpgradeable, Access, VaultAdapterStorageUtils {

    constructor() {
        _disableInitializers();
    }

    function initialize(address _accessControl) external initializer {
        __Access_init(_accessControl);
        __UUPSUpgradeable_init();
    }

    function rate(address _vault, address _asset) external returns (uint256 latestAnswer) {
        UtilizationData storage utilizationData = getVaultAdapterStorage().utilizationData[_vault][_asset];

        uint256 elapsed;
        uint256 utilization;
        if (block.timestamp > utilizationData.lastUpdate) {
            uint256 index = IVault(_vault).currentUtilizationIndex(_asset);
            elapsed = block.timestamp - utilizationData.lastUpdate;

            if (elapsed != block.timestamp) {
                utilization = (index - utilizationData.index) / elapsed;
            } else {
                utilization = IVault(_vault).utilization(_asset);
            }

            utilizationData.index = index;
            utilizationData.lastUpdate = block.timestamp;
        } else {
            utilization = IVault(_vault).utilization(_asset);
        }

        latestAnswer = _applySlopes(_vault, _asset, utilization, elapsed);
    }

    function setSlopes(address _asset, SlopeData memory _slopes) external checkAccess(this.setSlopes.selector) {
        if (_slopes.kink >= 1e27 || _slopes.kink == 0) revert InvalidKink();
        getVaultAdapterStorage().slopeData[_asset] = _slopes;
        emit SetSlopes(_asset, _slopes);
    }

    function setLimits(uint256 _maxMultiplier, uint256 _minMultiplier, uint256 _rate)
        external
        checkAccess(this.setLimits.selector)
    {
        VaultAdapterStorage storage $ = getVaultAdapterStorage();
        $.maxMultiplier = _maxMultiplier;
        $.minMultiplier = _minMultiplier;
        $.rate = _rate;
        emit SetLimits(_maxMultiplier, _minMultiplier, _rate);
    }

    function _applySlopes(address _vault, address _asset, uint256 _utilization, uint256 _elapsed)
        internal
        returns (uint256 interestRate)
    {
        VaultAdapterStorage storage $ = getVaultAdapterStorage();
        UtilizationData storage utilizationData = $.utilizationData[_vault][_asset];
        SlopeData memory slopes = $.slopeData[_asset];
        if (_utilization > slopes.kink) {
            uint256 excess = _utilization - slopes.kink;
            utilizationData.multiplier = utilizationData.multiplier
                * (1e27 + (1e27 * excess / (1e27 - slopes.kink)) * (_elapsed * $.rate / 1e27)) / 1e27;

            if (utilizationData.multiplier > $.maxMultiplier) {
                utilizationData.multiplier = $.maxMultiplier;
            }

            interestRate = (slopes.slope0 + (slopes.slope1 * excess / 1e27)) * utilizationData.multiplier / 1e27;
        } else {
            utilizationData.multiplier = utilizationData.multiplier * 1e27
                / (1e27 + (1e27 * (slopes.kink - _utilization) / slopes.kink) * (_elapsed * $.rate / 1e27));

            if (utilizationData.multiplier < $.minMultiplier) {
                utilizationData.multiplier = $.minMultiplier;
            }

            interestRate = (slopes.slope0 * _utilization / slopes.kink) * utilizationData.multiplier / 1e27;
        }
    }

    function _authorizeUpgrade(address) internal view override checkAccess(bytes4(0)) { }
}
