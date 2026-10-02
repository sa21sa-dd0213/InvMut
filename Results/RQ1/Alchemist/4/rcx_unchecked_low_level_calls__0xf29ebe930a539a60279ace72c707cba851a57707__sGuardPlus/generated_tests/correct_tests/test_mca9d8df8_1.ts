import { expect } from "chai";
import { ethers } from "hardhat";

describe("B mutant detection - mca9d8df8", function () {
  it("should detect mutant by checking contract balance after go() call with value", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("B");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some initial balance (e.g., from fallback)
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    const initialContractBalance = await ethers.provider.getBalance(
      await instance.getAddress()
    );
    expect(initialContractBalance).to.equal(ethers.parseEther("1.0"));

    // Call go() with a non-zero value from addr1
    const tx = await instance.connect(addr1).go({ value: ethers.parseEther("0.5") });
    await tx.wait();

    // After go() call, contract balance should be zero
    // In original: funds sent to external address, then owner gets balance
    // In mutant: funds sent to self, balance remains, then transfer to owner might fail or leave balance
    const finalContractBalance = await ethers.provider.getBalance(
      await instance.getAddress()
    );
    expect(finalContractBalance).to.equal(0);
  });
});