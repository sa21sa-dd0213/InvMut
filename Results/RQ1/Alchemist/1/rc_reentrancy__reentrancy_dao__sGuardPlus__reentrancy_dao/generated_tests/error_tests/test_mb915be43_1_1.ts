import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant test - mb915be43", function () {
  it("should detect balance tracking error when depositing 1 wei", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const depositAmount = ethers.parseEther("1");
    const tx = await instance.deposit({ value: depositAmount });
    await tx.wait();

    const contractBalance = await ethers.provider.getBalance(await instance.getAddress());
    const storedBalance = await instance.balance();

    expect(storedBalance).to.equal(contractBalance);
  });
});