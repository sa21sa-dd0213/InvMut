import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 - kill mutant me60c0f74", function () {
  it("should kill the mutant by sending exactly address(this).balance wei to multiplicate", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some initial balance
    const initialBalance = ethers.parseEther("1.0");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: initialBalance
    });

    // Get current contract balance
    const contractBalanceBefore = await ethers.provider.getBalance(await instance.getAddress());

    // Send exactly the contract balance as msg.value to multiplicate
    // In the original: msg.value >= contractBalance triggers the if block
    // In the mutant: msg.value-1 >= contractBalance requires 1 wei more to trigger
    await expect(
      instance.connect(addr1).multiplicate(addr1.address, { value: contractBalanceBefore })
    ).to.not.be.reverted;
  });
});