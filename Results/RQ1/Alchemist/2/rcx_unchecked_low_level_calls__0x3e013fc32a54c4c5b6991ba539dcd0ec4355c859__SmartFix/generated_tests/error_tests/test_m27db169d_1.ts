import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 - kill mutant m27db169d", function () {
  it("should detect the mutant that subtracts 1 from msg.value in Command", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some initial balance for the test
    const initialFunding = ethers.parseEther("1.0");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: initialFunding
    });

    // Get initial balance of the target address
    const initialBalance = await ethers.provider.getBalance(addr1.address);

    // Call Command with a specific msg.value
    const callValue = ethers.parseEther("0.5");
    const data = "0x";
    const tx = await instance.connect(owner).Command(addr1.address, data, { value: callValue });
    await tx.wait();

    // Expected balance increase: msg.value (original) vs msg.value - 1 (mutant)
    const finalBalance = await ethers.provider.getBalance(addr1.address);
    
    // Original contract would transfer msg.value (callValue)
    // Mutant transfers msg.value - 1 (callValue - 1 wei)
    // This assertion will pass on original but fail on mutant
    expect(finalBalance - initialBalance).to.equal(callValue);
  });
});