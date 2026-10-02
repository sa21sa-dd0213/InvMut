import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant detection - onlyRealPeople modifier", function () {
  it("should kill mutant by calling wager() from EOA and expecting success (mutant reverts for EOA)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const whaleAddress = owner.address;
    const wagerLimit = ethers.parseEther("1");

    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whaleAddress, wagerLimit);
    await instance.waitForDeployment();

    // Owner opens the contract to the public
    await (await instance.connect(owner).OpenToThePublic()).wait();

    // Call wager() from an EOA (addr1) - this should succeed on original, but fail on mutant
    // because mutant requires msg.sender != tx.origin (only contracts)
    await expect(
      instance.connect(addr1).wager({ value: wagerLimit })
    ).to.not.be.reverted;
  });
});