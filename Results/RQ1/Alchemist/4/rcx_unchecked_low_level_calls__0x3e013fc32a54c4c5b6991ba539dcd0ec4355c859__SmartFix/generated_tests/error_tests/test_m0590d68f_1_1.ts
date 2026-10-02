import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should detect mutant m0590d68f: when msg.value equals contract balance, original transfers funds but mutant does not", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with 2 ETH
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("2")
    });

    // Get initial balances
    const initialContractBalance = await ethers.provider.getBalance(await instance.getAddress());
    const initialAddr1Balance = await ethers.provider.getBalance(addr1.address);

    // Send exactly the contract's balance (2 ETH) to multiplicate - this should trigger the transfer in original
    // but fail to trigger in the mutant (which requires > instead of >=)
    const tx = await instance.connect(owner).multiplicate(addr1.address, {
      value: initialContractBalance
    });
    await tx.wait();

    // In the original: contract sends all balance + msg.value to addr1 (contract becomes 0)
    // In the mutant: condition fails (2 > 2 is false), no transfer occurs, contract keeps 2 ETH
    const finalContractBalance = await ethers.provider.getBalance(await instance.getAddress());
    const finalAddr1Balance = await ethers.provider.getBalance(addr1.address);

    // If original: finalContractBalance = 0, addr1 gains 4 ETH (2 + 2)
    // If mutant: finalContractBalance = 2 ETH, addr1 gains nothing (or only gas cost)
    expect(finalContractBalance).to.equal(0);
    expect(finalAddr1Balance).to.equal(initialAddr1Balance + ethers.parseEther("4"));
  });
});