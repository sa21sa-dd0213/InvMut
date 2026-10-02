import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 mutant maeb80bde test", function () {
  it("should kill mutant by sending ether to multiplicate when contract has balance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some initial balance
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    const contractBalanceBefore = await ethers.provider.getBalance(await instance.getAddress());
    const msgValue = ethers.parseEther("5");

    // Call multiplicate with a value less than contract balance
    // In the original, this would succeed (10 + 5 >= 10)
    // In the mutant, this should revert (10 - 5 >= 10 is false)
    await expect(
      instance.connect(owner).multiplicate(addr1.address, { value: msgValue })
    ).to.be.reverted;

    // Verify contract balance remains unchanged (no transfer happened)
    const contractBalanceAfter = await ethers.provider.getBalance(await instance.getAddress());
    expect(contractBalanceAfter).to.equal(contractBalanceBefore);
  });
});