import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant detection - m641ba3fb", function () {
  it("should revert when non-creator calls migrateTo (detect missing access control)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract so migrateTo has balance to transfer
    const depositTx = await instance.connect(owner).deposit({ value: ethers.parseEther("1") });
    await depositTx.wait();

    // Attempt to call migrateTo from a non-creator address (addr1)
    // Original contract would revert with require(creator == msg.sender)
    await expect(
      instance.connect(addr1).migrateTo(addr2.address)
    ).to.be.reverted;

    // Additional verification: contract balance should remain unchanged
    const contractBalance = await ethers.provider.getBalance(instance.target);
    expect(contractBalance).to.equal(ethers.parseEther("1"));
  });
});