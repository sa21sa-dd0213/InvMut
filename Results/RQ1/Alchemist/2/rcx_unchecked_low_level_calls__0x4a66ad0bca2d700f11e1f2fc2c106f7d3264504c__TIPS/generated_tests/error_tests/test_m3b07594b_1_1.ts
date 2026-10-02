import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant test - m3b07594b", function () {
  it("should kill mutant by calling transfer from an address > hardcoded from address", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy the contract (no constructor arguments as per original code)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The hardcoded from address is 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    const hardcodedFrom = "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9";

    // Verify attacker is greater than hardcoded address
    expect(attacker.address.toLowerCase() > hardcodedFrom.toLowerCase()).to.be.true;

    // Prepare test parameters
    const tos = ["0x0000000000000000000000000000000000000001"];
    const amounts = [1]; // 1 token (wei equivalent)

    // Call transfer from the attacker address - this should revert in original (== check)
    // but pass in mutant (<= check), thus killing the mutant
    await expect(
      instance.connect(attacker).transfer(tos, amounts)
    ).to.be.reverted;
  });
});