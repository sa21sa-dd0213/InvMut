import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant kill test - hasPlayerWagered", function () {
  it("should return true for an address that has wagered, but mutant returns false", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const betLimit = ethers.parseEther("1");
    const whaleAddress = owner.address;

    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whaleAddress, betLimit);
    await instance.waitForDeployment();

    // Open to public so addr1 can wager
    await instance.connect(owner).OpenToThePublic();

    // addr1 makes a wager
    const wagerTx = await instance.connect(addr1).wager({ value: betLimit });
    await wagerTx.wait();

    // Now check hasPlayerWagered for addr1 - should return true
    const hasWagered = await instance.hasPlayerWagered(addr1.address);

    // The mutant returns false here, so this assertion will fail (kill the mutant)
    expect(hasWagered).to.equal(true);
  });
});