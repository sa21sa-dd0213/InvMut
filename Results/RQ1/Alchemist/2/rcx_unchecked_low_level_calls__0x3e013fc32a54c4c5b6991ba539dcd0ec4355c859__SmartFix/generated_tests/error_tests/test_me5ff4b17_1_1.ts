import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant me5ff4b17 by sending non-zero msg.value to multiplicate", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some initial balance so that multiplicate can transfer
    const initialFunding = ethers.parseEther("1.0");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: initialFunding
    });

    // Prepare data for the call (empty bytes is acceptable)
    const emptyData = "0x";

    // Capture contract balance before call
    const balanceBefore = await ethers.provider.getBalance(await instance.getAddress());

    // Call multiplicate with non-zero msg.value (e.g., 0.5 ether)
    const tx = instance.connect(owner).multiplicate(addr1.address, { value: ethers.parseEther("0.5") });

    // On the original contract this would succeed, on the mutant it reverts
    await expect(tx).to.be.reverted;
  });
});