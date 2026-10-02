import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant ma1e2a632 - wager amount validation", function () {
  it("should revert when sending exactly betLimit (mutant expects betLimit+1)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const whaleAddress = addr1.address;
    const wagerLimit = ethers.parseEther("1.0");
    
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whaleAddress, wagerLimit);
    await instance.waitForDeployment();

    // Open the contract to the public
    await instance.connect(owner).OpenToThePublic();

    // Send exactly betLimit (1 ether) - should succeed on original, fail on mutant
    await expect(
      instance.connect(addr1).wager({ value: wagerLimit })
    ).to.be.reverted;
  });
});