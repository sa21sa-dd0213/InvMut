import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource mutant kill test - onlyOwner modifier", function () {
  it("should revert when non-owner calls approveMax() with onlyOwner modifier", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy a mock savings contract that returns a valid underlying token
    const MockERC20 = await ethers.getContractFactory("ERC20Mock");
    const mockToken = await MockERC20.deploy("Mock", "MCK", 18);
    await mockToken.waitForDeployment();
    
    const MockSavingsContract = await ethers.getContractFactory("MockSavingsContractV2");
    const mockSavings = await MockSavingsContract.deploy(await mockToken.getAddress());
    await mockSavings.waitForDeployment();
    
    // Deploy MStableYieldSource
    const Factory = await ethers.getContractFactory("MStableYieldSource");
    const instance = await Factory.deploy(await mockSavings.getAddress());
    await instance.waitForDeployment();
    
    // Attempt to call approveMax() from non-owner address
    // The mutant removes the require check, so this should NOT revert on mutant
    // But on original contract, it SHOULD revert
    await expect(
      instance.connect(addr1).approveMax()
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });
});

// Mock contracts for testing
contract ERC20Mock {
    string public name;
    string public symbol;
    uint8 public decimals;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    constructor(string memory _name, string memory _symbol, uint8 _decimals) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
    }
    
    function approve(address spender, uint256 amount) public returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }
    
    function transferFrom(address from, address to, uint256 amount) public returns (bool) {
        require(balanceOf[from] >= amount);
        require(allowance[from][msg.sender] >= amount);
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;
        return true;
    }
    
    function transfer(address to, uint256 amount) public returns (bool) {
        require(balanceOf[msg.sender] >= amount);
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

contract MockSavingsContractV2 {
    IERC20 public underlying;
    
    constructor(address _underlying) {
        underlying = IERC20(_underlying);
    }
    
    function exchangeRate() external pure returns (uint256) {
        return 1e18;
    }
    
    function depositSavings(uint256 amount) external returns (uint256) {
        return amount;
    }
    
    function redeemUnderlying(uint256 amount) external returns (uint256) {
        return amount;
    }
}

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}