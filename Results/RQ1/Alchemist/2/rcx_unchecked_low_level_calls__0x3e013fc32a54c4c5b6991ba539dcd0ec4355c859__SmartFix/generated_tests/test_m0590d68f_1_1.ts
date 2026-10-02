import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 mutant detection - m0590d68f", function () {
  it("should detect the mutant by sending exactly the contract balance and expecting the transfer to execute", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether (e.g., 1 ETH)
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    const contractBalanceBefore = await ethers.provider.getBalance(await instance.getAddress());
    expect(contractBalanceBefore).to.equal(ethers.parseEther("1.0"));

    // Send exactly the contract balance (1 ETH) to trigger multiplicate
    // In the original, msg.value >= balance is true; in mutant, msg.value > balance is false
    const target = addr2;
    const tx = await instance.connect(addr1).multiplicate(target.address, {
      value: ethers.parseEther("1.0")
    });
    await tx.wait();

    // If mutant is present, the transfer inside the if-block did NOT execute
    // The contract should still have its original balance plus the sent 1 ETH = 2 ETH
    const contractBalanceAfter = await ethers.provider.getBalance(await instance.getAddress());
    const targetBalance = await ethers.provider.getBalance(target.address);

    // In the original: contract sends all balance (1+1=2 ETH) to target, leaving contract with 0
    // In the mutant: condition fails, contract keeps 1+1=2 ETH, target gets 0
    // We assert the mutant behavior (transfer did NOT happen) to kill it
    expect(contractBalanceAfter).to.equal(ethers.parseEther("2.0"));
    expect(targetBalance).to.equal(ethers.parseEther("0.0"));
  });
});