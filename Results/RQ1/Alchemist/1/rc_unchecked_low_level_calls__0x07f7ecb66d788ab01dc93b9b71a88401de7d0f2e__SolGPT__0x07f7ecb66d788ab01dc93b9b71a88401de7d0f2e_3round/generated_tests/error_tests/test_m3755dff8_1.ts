import { expect } from "chai";
import { ethers } } from "hardhat";

describe("PoCGame mutant detection", function () {
  it("should detect mutant m3755dff8 by verifying wager amount is recorded correctly", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy with constructor arguments: whaleAddress, wagerLimit
    const betLimit = ethers.parseEther("1.0");
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(addr2.address, betLimit);
    await instance.waitForDeployment();

    // Owner opens the contract to public
    await instance.connect(owner).OpenToThePublic();

    // addr1 sends exactly betLimit to wager
    const tx = await instance.connect(addr1).wager({ value: betLimit });
    await tx.wait();

    // Query the recorded wager for addr1
    const recordedWager = await instance.wagers(addr1.address);

    // In original contract, recordedWager should equal betLimit
    // In mutant, recordedWager will be betLimit - 1 (since msg.value-1 is stored)
    expect(recordedWager).to.equal(betLimit);
  });
});