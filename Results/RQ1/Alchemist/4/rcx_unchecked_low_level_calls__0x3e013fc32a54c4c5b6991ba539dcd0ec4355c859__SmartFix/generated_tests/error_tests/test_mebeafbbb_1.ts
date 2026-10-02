import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 mutant mebeafbbb test", function () {
  it("should kill mutant by checking contract balance is zero after multiplicate with exact balance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with 2 ether
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("2")
    });

    const contractBalanceBefore = await ethers.provider.getBalance(await instance.getAddress());
    
    // Send exactly the contract balance as msg.value
    const tx = await instance.connect(owner).multiplicate(addr1.address, {
      value: contractBalanceBefore
    });
    await tx.wait();

    const contractBalanceAfter = await ethers.provider.getBalance(await instance.getAddress());
    
    // Original would leave 0, mutant leaves 1 wei
    expect(contractBalanceAfter).to.equal(0);
  });
});