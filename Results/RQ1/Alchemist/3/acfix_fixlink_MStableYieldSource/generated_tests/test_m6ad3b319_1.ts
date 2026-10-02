import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource mutant detection - onlyOwner modifier", function () {
  it("should revert when non-owner calls approveMax() due to onlyOwner modifier", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy a mock savings contract that returns a mock mAsset
    const MockSavings = await ethers.getContractFactory("MockSavingsContractV2");
    const mockSavings = await MockSavings.deploy();
    await mockSavings.waitForDeployment();
    
    // Deploy MStableYieldSource with the mock savings contract
    const MStableYieldSource = await ethers.getContractFactory("MStableYieldSource");
    const instance = await MStableYieldSource.deploy(await mockSavings.getAddress());
    await instance.waitForDeployment();
    
    // Attempt to call approveMax() from a non-owner address
    // In the original contract, this should revert
    // In the mutant where the require statement is removed, it would succeed
    await expect(
      instance.connect(addr1).approveMax()
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });
});

// Helper mock contract for testing
// Note: In a real test environment, this would be deployed as a separate contract
// For the test to work, we need a mock that implements the required interface
contract MockSavingsContractV2 {
    function underlying() external view returns (address) {
        // Return a mock ERC20 token address
        return address(this);
    }
    
    function exchangeRate() external view returns (uint256) {
        return 1e18;
    }
    
    function depositSavings(uint256 _amount) external returns (uint256 creditsIssued) {
        return _amount;
    }
    
    function redeemUnderlying(uint256 _amount) external returns (uint256 creditsBurned) {
        return _amount;
    }
    
    function balanceOf(address) external view returns (uint256) {
        return 0;
    }
}