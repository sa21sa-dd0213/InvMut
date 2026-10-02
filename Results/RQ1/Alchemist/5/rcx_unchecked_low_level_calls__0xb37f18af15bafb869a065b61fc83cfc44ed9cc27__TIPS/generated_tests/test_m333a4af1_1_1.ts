import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when sendMoney is called by non-owner (original); mutant should allow it", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract so it has balance to send
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Try calling sendMoney from unauthorized address (addr1)
    // Original contract would revert due to onlyOwner modifier
    // Mutant would allow the call to succeed
    const tx = instance.connect(addr1).sendMoney(addr2.address, ethers.parseEther("0.5"));

    // This assertion kills the mutant: if the call doesn't revert (mutant), the test fails
    await expect(tx).to.be.revertedWith(""); // Empty revert reason as original modifier has no custom message
  });
});