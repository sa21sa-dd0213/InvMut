import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherCartel mutant m54be67f4 - DrugDealer function", function () {
  it("should allow CEO to change CEO address (original behavior), but mutant reverts when CEO calls", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherCartel");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The contract's ceoAddress is set to 0x85abE8E3bed0d4891ba201Af1e212FE50bb65a26 in the contract code
    // We need to use a signer that matches that address to call DrugDealer
    // Since we can't control that address in tests, we'll deploy with a different approach:
    // We'll test by calling from owner (who is not the CEO) to see if mutant allows it incorrectly

    // First verify that the original CEO address is set
    const ceoAddress = await instance.ceoAddress();

    // The mutant changes require(msg.sender == ceoAddress) to require(msg.sender != ceoAddress)
    // So the mutant will REVERT when the CEO calls it, and ALLOW non-CEO to call it

    // Test 1: Call DrugDealer from a non-CEO address - this should REVERT in original but PASS in mutant
    // We'll call from addr1 (non-CEO) and expect it to revert in original
    // But in mutant it will succeed, so we test both scenarios

    // Since we cannot impersonate the hardcoded CEO address, we test the logic:
    // The mutant allows non-CEO to change CEO address, which is the vulnerability

    // Call DrugDealer from non-CEO address (addr1)
    await expect(
      instance.connect(addr1).DrugDealer()
    ).to.be.revertedWith("Only CEO can set new address");

    // If this test passes, it means the original behavior is preserved (mutant is killed)
    // If it fails (doesn't revert), the mutant allowed non-CEO to call DrugDealer
  });
});