import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU reference (ethers v6)", function () {
  it("should detect mutant m060f4048 by testing multiplication vs exponentiation behavior", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy contract - no constructor arguments needed based on the provided code
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Verify the from address matches the deployer (the only authorized caller)
    const fromAddress = await instance.from();
    expect(fromAddress).to.equal(owner.address);

    // Prepare test inputs: _tos with one recipient, v with value 2 (2 tokens)
    const tos = [addr1.address];
    const v = [2];

    // Call transfer - original multiplies 2 * 10^18 = 2e18 (success)
    // Mutant exponentiates 2 ** 10^18 = astronomically huge number (revert due to overflow)
    const tx = await instance.connect(owner).transfer(tos, v);
    await tx.wait();

    // If the call succeeded (no revert), the mutant is killed because exponentiation would fail
    // Verify the transfer actually happened by checking balances (optional but good practice)
    // Note: The contract doesn't expose balanceOf, so we just assert the transaction succeeded
    expect(tx.hash).to.not.be.undefined;
  });
});