import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 - mutant md7e179a2 test", function () {
  it("should detect mutant that changes >= to > by sending exactly the contract balance", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("5")
    });

    // Get contract balance before the call
    const contractBalanceBefore = await ethers.provider.getBalance(await instance.getAddress());
    
    // Send exactly the contract balance to multiplicate
    // This should trigger the transfer in the original (>=) but not in the mutant (>)
    const tx = instance.connect(addr1).multiplicate(addr2.address, { value: contractBalanceBefore });
    
    // The mutant will NOT execute the transfer (msg.value == contractBalance, but mutant requires >)
    // Therefore the contract balance will remain unchanged in the mutant
    await expect(tx).to.not.changeEtherBalance(instance, contractBalanceBefore);
    
    // Additionally, verify the recipient did NOT receive the funds
    const recipientBalanceBefore = await ethers.provider.getBalance(addr2.address);
    await tx;
    const recipientBalanceAfter = await ethers.provider.getBalance(addr2.address);
    
    // In the original, recipient would receive contractBalanceBefore * 2 (balance + msg.value)
    // In the mutant, recipient receives nothing
    expect(recipientBalanceAfter).to.equal(recipientBalanceBefore);
  });
});