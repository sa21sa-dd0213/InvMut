import { expect } from "chai";
import { ethers } } from "hardhat";

describe("MultiplicatorX3 mutant kill test", function () {
  it("should kill mutant m5e3e89a8 by sending less than contract balance and expecting no transfer", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    const initialBalance = await ethers.provider.getBalance(await instance.getAddress());
    
    // Send less than the contract balance (e.g., 1 ether)
    const tx = instance.connect(addr1).multiplicate(addr2.address, { value: ethers.parseEther("1") });
    
    // The original contract should NOT transfer because msg.value < address(this).balance
    // The mutant would transfer, so we check balance remains unchanged
    await tx;
    const finalBalance = await ethers.provider.getBalance(await instance.getAddress());
    
    // In original contract, balance should remain same (no transfer happened)
    // In mutant, balance would be drained to 0, so this assertion fails
    expect(finalBalance).to.equal(initialBalance);
  });
});