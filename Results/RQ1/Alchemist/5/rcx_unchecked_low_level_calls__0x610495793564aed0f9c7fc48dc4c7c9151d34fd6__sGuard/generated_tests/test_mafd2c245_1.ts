import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when owner calls withdrawAll if onlyOwner uses != instead of ==", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the wallet so there's balance to withdraw
    const fundTx = await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    await fundTx.wait();

    // Owner should be able to call withdrawAll in the original contract
    // In the mutant, the require(msg.sender != owner) will cause revert
    await expect(
      instance.connect(owner).withdrawAll()
    ).to.be.reverted;
  });
});