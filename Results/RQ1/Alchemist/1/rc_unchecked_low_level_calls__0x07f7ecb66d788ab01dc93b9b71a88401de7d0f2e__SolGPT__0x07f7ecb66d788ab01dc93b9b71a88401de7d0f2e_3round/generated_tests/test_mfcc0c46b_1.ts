import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant mfcc0c46b test", function () {
  it("should kill the mutant by sending exact betLimit and expecting success", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PoCGame");
    const whaleAddress = addr1.address;
    const wagerLimit = ethers.parseEther("1.0");
    const instance = await Factory.deploy(whaleAddress, wagerLimit);
    await instance.waitForDeployment();

    // Owner opens the contract to public
    await (await instance.connect(owner).OpenToThePublic()).wait();

    // Send exactly the betLimit amount
    const tx = instance.connect(addr1).wager({ value: wagerLimit });

    // In the original contract this should succeed; in the mutant it will revert
    // because require(msg.value != betLimit) will fail when msg.value == betLimit
    await expect(tx).to.not.be.reverted;
  });
});