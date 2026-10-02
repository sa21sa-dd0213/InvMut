import { expect } from "chai";
import { ethers } from "hardhat";

describe("CVXStaker mutant m2db79de8 - recoverToken access control", function () {
  it("should revert when non-owner calls recoverToken on original, but not on mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy with required constructor arguments
    // CVXStaker(address _operator, IERC20 _clpToken, ICVXBooster _booster, address[] memory _rewardTokens)
    const clpToken = "0x0000000000000000000000000000000000000001"; // placeholder
    const booster = "0x0000000000000000000000000000000000000002"; // placeholder
    const rewardTokens: string[] = [];
    
    const Factory = await ethers.getContractFactory("CVXStaker");
    const instance = await Factory.deploy(addr1.address, clpToken, booster, rewardTokens);
    await instance.waitForDeployment();

    // Attempt to call recoverToken from non-owner (addr1)
    // The original contract has onlyOwner modifier, so this should revert
    // The mutant removes the modifier, so it would not revert
    await expect(
      instance.connect(addr1).recoverToken(
        "0x0000000000000000000000000000000000000003", // token
        owner.address, // to
        ethers.parseEther("1") // amount
      )
    ).to.be.reverted;
  });
});