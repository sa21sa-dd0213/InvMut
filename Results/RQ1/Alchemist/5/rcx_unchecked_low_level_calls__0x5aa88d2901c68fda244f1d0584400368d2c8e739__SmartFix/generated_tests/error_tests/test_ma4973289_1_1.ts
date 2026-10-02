import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should detect mutant ma4973289 by calling Command with msg.value equal to contract balance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send initial balance to contract so we can test exact balance scenario
    const initialBalance = ethers.parseEther("10");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: initialBalance
    });

    // Get current contract balance
    const contractBalance = await ethers.provider.getBalance(await instance.getAddress());

    // Call Command with msg.value equal to contract balance
    // Original: uses msg.value which equals contract balance, succeeds
    // Mutant: uses msg.value+1 which exceeds contract balance, reverts
    const data = "0x";
    await expect(
      instance.connect(owner).Command(addr1.address, data, { value: contractBalance })
    ).to.be.reverted;
  });
});