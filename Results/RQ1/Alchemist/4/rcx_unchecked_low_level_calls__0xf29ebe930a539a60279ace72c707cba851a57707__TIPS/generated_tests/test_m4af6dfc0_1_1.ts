import { expect } from "chai";
import { ethers } from "hardhat";

describe("B mutant kill test - m4af6dfc0", function () {
  it("should kill mutant by sending ETH when external call succeeds and expecting owner receives funds", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("B");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const targetAddress = "0xC8A60C51967F4022BF9424C337e9c6F0bD220E1C";

    // Fund the contract with some initial ETH so it has balance to transfer
    const fundTx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    await fundTx.wait();

    const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
    const contractBalanceBefore = await ethers.provider.getBalance(await instance.getAddress());

    // Call go() - this should succeed in original but revert in mutant
    const goTx = await instance.connect(addr1).go({ value: ethers.parseEther("0.5") });
    await goTx.wait();

    const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
    const contractBalanceAfter = await ethers.provider.getBalance(await instance.getAddress());

    // In original: owner receives contract balance (initial 1 ETH + 0.5 ETH sent = 1.5 ETH)
    // In mutant: transaction reverts, owner balance unchanged
    expect(ownerBalanceAfter).to.be.gt(ownerBalanceBefore);
    expect(contractBalanceAfter).to.equal(0);
  });
});