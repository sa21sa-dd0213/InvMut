import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 mutant detection", function () {
  it("should kill mutant m09066a54 by calling multiplicate with msg.value > 1 when contract has non-zero balance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send initial ETH to contract to create non-zero balance
    const initialDeposit = ethers.parseEther("10");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: initialDeposit
    });

    // Verify initial balance
    const initialBalance = await ethers.provider.getBalance(await instance.getAddress());
    expect(initialBalance).to.equal(initialDeposit);

    // Call multiplicate with msg.value = 5 ether (>1) - should revert in mutant because product (10*5=50) exceeds balance
    const attackValue = ethers.parseEther("5");
    await expect(
      instance.connect(owner).multiplicate(addr1.address, { value: attackValue })
    ).to.be.reverted;
  });
});