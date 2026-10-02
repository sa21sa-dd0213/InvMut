import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when msg.value is exactly 1 wei less than contract balance (kills mutant mdc8e1c39)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const instanceAddress = await instance.getAddress();

    // Fund the contract with 2 ether from owner
    await owner.sendTransaction({
      to: instanceAddress,
      value: ethers.parseEther("2")
    });

    // Contract balance is now 2 ether
    // Send exactly 1.999999999999999999 ether (1 wei less than 2 ether)
    const attackValue = ethers.parseEther("2") - 1n;

    // The original requires msg.value >= contract balance (2 ether)
    // 1.999999999999999999 < 2, so original reverts
    // The mutant uses msg.value+1, making it 2 ether >= 2 ether, so it passes
    await expect(
      instance.connect(owner).multiplicate(addr1.address, { value: attackValue })
    ).to.be.reverted;
  });
});