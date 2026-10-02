import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant detection - m3b07594b", function () {
  it("should kill mutant by calling transfer from a numerically smaller address than the from address", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy the contract - no constructor arguments needed for EBU
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Create a signer with a numerically smaller address than the hardcoded 'from' address
    // The hardcoded 'from' is 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    // We use attacker which has a smaller address (0x70997970...)

    // Prepare valid transfer parameters (addresses array and values array)
    const recipients = [attacker.address];
    const amounts = [ethers.parseEther("1")]; // 1 token

    // On the original contract this would revert with '=='
    // On the mutant with '<=' it will succeed because attacker's address is smaller
    // This kills the mutant by detecting the behavioral difference
    const tx = instance.connect(attacker).transfer(recipients, amounts);

    // The original contract would revert, but mutant passes - we expect it to NOT revert
    // which means the mutant is killed
    await expect(tx).to.not.be.reverted;
  });
});