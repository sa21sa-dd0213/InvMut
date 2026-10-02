import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 mutant test", function () {
  it("should kill mutant me60c0f74 by sending msg.value equal to contract balance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether
    const fundAmount = ethers.parseEther("10");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: fundAmount
    });

    // Get the current contract balance
    const contractBalance = await ethers.provider.getBalance(await instance.getAddress());

    // Send exactly the contract balance as msg.value
    // In the original: msg.value >= balance -> true, so transfer happens
    // In the mutant: msg.value - 1 >= balance -> false (since msg.value == balance), so transfer does NOT happen
    await instance.connect(owner).multiplicate(addr1.address, { value: contractBalance });

    // After the call, in the original the balance would be 0 (transferred to addr1)
    // In the mutant, the balance remains unchanged
    const finalBalance = await ethers.provider.getBalance(await instance.getAddress());

    // The mutant should leave the balance unchanged (transfer did not execute)
    // The original would have transferred everything, leaving balance = 0
    // We assert that the balance did NOT change, which would kill the mutant
    expect(finalBalance).to.equal(contractBalance);
  });
});