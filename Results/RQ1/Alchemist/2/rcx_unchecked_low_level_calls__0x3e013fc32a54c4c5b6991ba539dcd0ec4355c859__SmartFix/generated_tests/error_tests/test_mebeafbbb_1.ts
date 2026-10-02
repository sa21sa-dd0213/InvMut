import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 - Kill mutant mebeafbbb", function () {
  it("should detect the -1 wei mutation in multiplicate function", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with 2 ether
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("2")
    });

    // Get initial balances
    const initialContractBalance = await ethers.provider.getBalance(await instance.getAddress());
    const initialAddr1Balance = await ethers.provider.getBalance(addr1.address);

    // Call multiplicate with 1 ether
    const msgValue = ethers.parseEther("1");
    const tx = await instance.connect(owner).multiplicate(addr1.address, { value: msgValue });
    await tx.wait();

    // Expected transfer: initialContractBalance + msgValue
    const expectedTransfer = initialContractBalance + msgValue;
    const finalAddr1Balance = await ethers.provider.getBalance(addr1.address);
    const actualTransfer = finalAddr1Balance - initialAddr1Balance;

    // The original would transfer exactly expectedTransfer, mutant transfers 1 wei less
    expect(actualTransfer).to.equal(expectedTransfer);
  });
});