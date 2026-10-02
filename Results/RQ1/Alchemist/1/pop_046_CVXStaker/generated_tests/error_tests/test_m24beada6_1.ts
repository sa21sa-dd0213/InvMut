import { expect } from "chai";
import { ethers } from "hardhat";

describe("CVXStaker mutant m24beada6 - setCvxPoolInfo authorization", function () {
  it("should revert when non-owner calls setCvxPoolInfo", async function () {
    const [owner, nonOwner] = await ethers.getSigners();
    
    // Deploy with constructor arguments: _operator, _clpToken, _booster, _rewardTokens
    // We need valid addresses for the constructor. Using placeholder addresses that pass type checks.
    const mockOperator = owner.address;
    const mockClpToken = ethers.Wallet.createRandom().address; // random address for IERC20
    const mockBooster = ethers.Wallet.createRandom().address; // random address for ICVXBooster
    const mockRewardTokens: string[] = []; // empty array for rewardTokens

    const Factory = await ethers.getContractFactory("CVXStaker");
    const instance = await Factory.deploy(
      mockOperator,
      mockClpToken,
      mockBooster,
      mockRewardTokens
    );
    await instance.waitForDeployment();

    // Attempt to call setCvxPoolInfo from non-owner address
    await expect(
      instance.connect(nonOwner).setCvxPoolInfo(
        1, // _pId
        ethers.Wallet.createRandom().address, // _token
        ethers.Wallet.createRandom().address // _rewards
      )
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });
});