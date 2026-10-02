import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m1de27864 by calling multiplicate with positive msg.value and expecting success", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some initial balance
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    const initialBalance = await ethers.provider.getBalance(await instance.getAddress());
    
    // Call multiplicate with a positive msg.value (less than contract balance to satisfy the outer if)
    const tx = await instance.connect(owner).multiplicate(addr1.address, {
      value: ethers.parseEther("0.5")
    });
    await tx.wait();

    // On original: succeeds and transfers balance to addr1
    // On mutant: reverts because require((balance + msg.value) <= balance) fails
    // If no revert, the test passes (killing the mutant)
  });
});