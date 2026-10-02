import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource mutant kill test - supplyTokenTo empty body", function () {
  it("should detect that supplyTokenTo does not update imBalances when function body is removed", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy mock savings contract that returns deterministic values
    const MockSavingsFactory = await ethers.getContractFactory("MockSavingsContractV2");
    const mockSavings = await MockSavingsFactory.deploy();
    await mockSavings.waitForDeployment();
    
    // Deploy mock mAsset token
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    const mockMAsset = await MockERC20Factory.deploy();
    await mockMAsset.waitForDeployment();
    
    // Configure mock savings to return our mAsset
    await mockSavings.setUnderlying(mockMAsset.target);
    
    // Deploy MStableYieldSource with mock savings
    const Factory = await ethers.getContractFactory("MStableYieldSource");
    const instance = await Factory.deploy(mockSavings.target);
    await instance.waitForDeployment();
    
    // Mint tokens to addr1 and approve the yield source
    const supplyAmount = ethers.parseEther("100");
    await mockMAsset.mint(addr1.address, supplyAmount);
    await mockMAsset.connect(addr1).approve(instance.target, supplyAmount);
    
    // Configure mock savings to return a fixed amount of credits
    const creditsIssued = ethers.parseEther("95"); // Some conversion rate
    await mockSavings.setCreditsIssued(creditsIssued);
    
    // Record balance before
    const balanceBefore = await instance.imBalances(addr1.address);
    
    // Call supplyTokenTo - in mutant this should do nothing
    await instance.connect(addr1).supplyTokenTo(supplyAmount, addr1.address);
    
    // Record balance after
    const balanceAfter = await instance.imBalances(addr1.address);
    
    // The mutant removes the body, so balance should be unchanged
    // The original would have increased it by creditsIssued
    expect(balanceAfter).to.equal(balanceBefore);
    
    // Additional check: verify tokens were NOT transferred to the contract
    const contractBalance = await mockMAsset.balanceOf(instance.target);
    expect(contractBalance).to.equal(0);
  });
});

// Helper mock contracts for testing
contract MockSavingsContractV2 {
    address private _underlying;
    uint256 private _creditsIssued;
    uint256 private _exchangeRate = 1e18;
    
    function setUnderlying(address _token) external {
        _underlying = _token;
    }
    
    function setCreditsIssued(uint256 _amount) external {
        _creditsIssued = _amount;
    }
    
    function underlying() external view returns (IERC20) {
        return IERC20(_underlying);
    }
    
    function depositSavings(uint256) external returns (uint256) {
        return _creditsIssued;
    }
    
    function exchangeRate() external view returns (uint256) {
        return _exchangeRate;
    }
    
    function redeemUnderlying(uint256) external returns (uint256) {
        return 0;
    }
}

contract MockERC20 {
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;
    
    function mint(address to, uint256 amount) external {
        _balances[to] += amount;
    }
    
    function approve(address spender, uint256 amount) external returns (bool) {
        _allowances[msg.sender][spender] = amount;
        return true;
    }
    
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(_allowances[from][msg.sender] >= amount, "allowance exceeded");
        _balances[from] -= amount;
        _balances[to] += amount;
        _allowances[from][msg.sender] -= amount;
        return true;
    }
    
    function balanceOf(address account) external view returns (uint256) {
        return _balances[account];
    }
    
    function totalSupply() external view returns (uint256) { return 0; }
    function transfer(address, uint256) external returns (bool) { return true; }
    function allowance(address, address) external view returns (uint256) { return 0; }
}