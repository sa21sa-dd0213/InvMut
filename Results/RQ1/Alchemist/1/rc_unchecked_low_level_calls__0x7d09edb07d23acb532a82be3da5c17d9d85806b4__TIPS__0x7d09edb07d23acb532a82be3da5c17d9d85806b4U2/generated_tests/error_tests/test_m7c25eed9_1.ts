import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant kill test - m7c25eed9", function () {
  it("should revert when calling wager() before contract is open to public", async function () {
    const [owner, player] = await ethers.getSigners();
    const betLimit = ethers.parseEther("1.0");
    const whaleAddress = owner.address;
    
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whaleAddress, betLimit);
    await instance.waitForDeployment();

    // Contract starts with openToPublic = false
    // Attempt to call wager() - should revert because isOpenToPublic modifier requires openToPublic to be true
    await expect(
      instance.connect(player).wager({ value: betLimit })
    ).to.be.reverted;
  });
});