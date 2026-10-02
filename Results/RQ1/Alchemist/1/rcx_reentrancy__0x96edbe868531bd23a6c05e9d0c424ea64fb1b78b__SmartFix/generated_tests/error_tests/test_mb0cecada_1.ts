import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant detection test", function () {
  it("should detect mutant mb0cecada by verifying exact balance after Put", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send exactly 100 wei to Put
    const depositAmount = ethers.parseEther("0.0000000000000001"); // 100 wei
    const tx = await instance.connect(owner).Put(0, { value: depositAmount });
    await tx.wait();

    // Check the recorded balance - should be exactly 100 wei
    const holder = await instance.Acc(owner.address);
    expect(holder.balance).to.equal(depositAmount);
  });
});