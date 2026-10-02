import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when multiplicate is called with msg.value less than contract balance (kills mutant that replaces condition with true)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some initial balance
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // Get initial contract balance
    const initialBalance = await ethers.provider.getBalance(await instance.getAddress());
    expect(initialBalance).to.equal(ethers.parseEther("10"));

    // Try to call multiplicate with msg.value (1 ETH) less than contract balance (10 ETH)
    // Original should revert because msg.value (1) < address(this).balance (10)
    // Mutant would not revert because condition is always true
    await expect(
      instance.connect(owner).multiplicate(addr2.address, { value: ethers.parseEther("1") })
    ).to.be.reverted;
  });
});