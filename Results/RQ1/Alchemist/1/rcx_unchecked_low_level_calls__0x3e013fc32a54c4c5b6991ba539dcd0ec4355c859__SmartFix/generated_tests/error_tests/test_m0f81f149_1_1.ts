import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 mutant kill test - m0f81f149", function () {
  it("should revert when non-owner calls Command on original, but succeed on mutant", async function () {
    const [owner, attacker, recipient] = await ethers.getSigners();
    
    // Deploy contract (no constructor arguments)
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Fund the contract with some ether so balance is non-zero
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    
    // Prepare call data (simple empty bytes)
    const callData = "0x";
    
    // Attempt to call Command from non-owner address
    // On original: should revert because of require(msg.sender == Owner)
    // On mutant: should succeed (no require), transferring msg.value to recipient
    const tx = instance.connect(attacker).Command(recipient.address, callData, {
      value: ethers.parseEther("5")
    });
    
    // The mutant will succeed (no revert), so we expect the transaction to NOT revert
    // This is the key difference: original reverts, mutant does not
    await expect(tx).to.not.be.reverted;
    
    // Verify that the recipient actually received the ether (confirms the call went through)
    const recipientBalance = await ethers.provider.getBalance(recipient.address);
    expect(recipientBalance).to.equal(ethers.parseEther("5"));
  });
});