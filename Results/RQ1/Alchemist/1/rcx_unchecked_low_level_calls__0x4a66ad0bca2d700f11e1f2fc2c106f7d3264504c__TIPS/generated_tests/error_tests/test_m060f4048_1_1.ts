import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant test for m060f4048", function () {
  it("should kill mutant by using v[i] = 2, which causes overflow with exponentiation", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy the contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The contract's from address is 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    // We need to impersonate that address or use the owner signer that matches it
    // Since we cannot control the from address, we use the owner as msg.sender
    // The require checks msg.sender == 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    // So we need to use that specific address as the signer

    // Get the signer for the authorized address
    const authorizedSigner = await ethers.getSigner("0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9");

    // Prepare arrays: one recipient and value = 2 (will cause overflow with **)
    const recipients = [addr1.address];
    const values = [2]; // 2 * 10^18 will overflow uint256

    // This should revert on the mutant due to exponentiation overflow
    // but succeed on the original (2 * 10^18 is valid)
    await expect(
      instance.connect(authorizedSigner).transfer(recipients, values)
    ).to.be.reverted;
  });
});