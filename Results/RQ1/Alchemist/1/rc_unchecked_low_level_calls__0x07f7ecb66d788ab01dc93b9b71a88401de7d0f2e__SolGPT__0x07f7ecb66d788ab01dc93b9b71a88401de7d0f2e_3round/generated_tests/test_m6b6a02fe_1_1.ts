import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant m6b6a02fe test", function () {
  it("should revert when calling wager() before openToPublic is set to true", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const betLimit = ethers.parseEther("1");
    const whaleAddress = addr1.address;

    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whaleAddress, betLimit);
    await instance.waitForDeployment();

    // Attempt to call wager() when openToPublic is still false (default)
    // In the original contract this should revert
    // In the mutant (without require(openToPublic)) this should succeed, which is wrong
    await expect(
      instance.connect(addr1).wager({ value: betLimit })
    ).to.be.reverted;
  });
});