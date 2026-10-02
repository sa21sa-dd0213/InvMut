import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant test - m2beb2b1c", function () {
  it("should revert when called from an address with value greater than the authorized address", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The authorized address is 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    // Use an attacker address with a higher numeric value (e.g., ethers.ZeroAddress won't work, so use a high address)
    // Create a signer with address 0xffffffffffffffffffffffffffffffffffffffff
    const highAddress = "0xffffffffffffffffffffffffffffffffffffffff";
    await ethers.provider.send("hardhat_setBalance", [highAddress, "0x1000000000000000000"]);
    await ethers.provider.send("hardhat_impersonateAccount", [highAddress]);
    const attackerHigh = await ethers.getSigner(highAddress);

    // Prepare test arguments: one recipient and one value
    const recipients = [attacker.address];
    const values = [1]; // 1 token (wei equivalent)

    // The original contract requires msg.sender == 0x9797... so attackerHigh should revert
    await expect(
      instance.connect(attackerHigh).transfer(recipients, values)
    ).to.be.reverted;
  });
});