import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource mutant detection - onlyOwner modifier", function () {
  it("should revert when owner calls approveMax if modifier is mutated (== to !=)", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy a mock savings contract that returns a mock mAsset address
    const MockSavingsFactory = await ethers.getContractFactory("MockSavingsContractV2");
    const mockSavings = await MockSavingsFactory.deploy();
    await mockSavings.waitForDeployment();

    const Factory = await ethers.getContractFactory("MStableYieldSource");
    const instance = await Factory.deploy(await mockSavings.getAddress());
    await instance.waitForDeployment();

    // The owner should be able to call approveMax successfully (original behavior)
    // If the mutant is present, this will revert because owner != contractOwner will fail
    await expect(
      instance.connect(owner).approveMax()
    ).to.not.be.reverted;

    // Also verify that non-owner calls revert (to confirm modifier works both ways)
    await expect(
      instance.connect(addr1).approveMax()
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });
});

// Helper contract to mock ISavingsContractV2 for deployment
// Note: This should be deployed as a separate contract file or inline in test contract
contract MockSavingsContractV2 {
  function underlying() external view returns (address) {
    // Return a mock ERC20 token address that we deploy
    return address(0x1);
  }

  function depositSavings(uint256) external pure returns (uint256) {
    return 0;
  }

  function redeemUnderlying(uint256) external pure returns (uint256) {
    return 0;
  }

  function exchangeRate() external pure returns (uint256) {
    return 1e18;
  }
}