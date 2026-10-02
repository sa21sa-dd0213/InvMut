import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m09066a54 by verifying multiplication instead of addition causes incorrect transfer amount", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const instanceAddress = await instance.getAddress();

    // Fund the contract with 1 ether
    await owner.sendTransaction({
      to: instanceAddress,
      value: ethers.parseEther("1.0")
    });

    // Get initial balance of addr2
    const initialBalance = await ethers.provider.getBalance(addr2.address);

    // Call multiplicate with 2 ether (msg.value = 2)
    // Original: transfer = 1 + 2 = 3 ether
    // Mutant: transfer = 1 * 2 = 2 ether
    const tx = await instance.connect(owner).multiplicate(addr2.address, {
      value: ethers.parseEther("2.0")
    });
    await tx.wait();

    // Check that addr2 received 3 ether (original behavior)
    // If mutant is present, addr2 will only receive 2 ether
    const finalBalance = await ethers.provider.getBalance(addr2.address);
    expect(finalBalance - initialBalance).to.equal(ethers.parseEther("3.0"));

    // Also verify contract balance is zero (original behavior)
    const contractBalance = await ethers.provider.getBalance(instanceAddress);
    expect(contractBalance).to.equal(0);
  });
});