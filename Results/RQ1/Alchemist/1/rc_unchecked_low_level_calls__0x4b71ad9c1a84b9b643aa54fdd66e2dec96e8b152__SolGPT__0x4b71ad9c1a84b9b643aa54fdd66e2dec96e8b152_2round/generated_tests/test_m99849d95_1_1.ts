import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should return true when transfer succeeds, killing mutant that removes return true", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20-like token that will accept the transferFrom call
    const TokenFactory = await ethers.getContractFactory("MockToken");
    const token = await TokenFactory.deploy();
    await token.waitForDeployment();

    // Approve the airPort contract to transfer tokens from owner
    await token.approve(await instance.getAddress(), ethers.parseEther("100"));

    // Call transfer with valid parameters
    const recipients = [await addr1.getAddress(), await addr2.getAddress()];
    const tx = await instance.transfer(
      await owner.getAddress(),
      await token.getAddress(),
      recipients,
      ethers.parseEther("10")
    );
    const receipt = await tx.wait();

    // The return value should be true - this will fail on the mutant
    await expect(tx).to.emit(instance, "Transfer"); // optional check
    expect(receipt.status).to.equal(1); // transaction succeeded

    // The actual return value check:
    const result = await instance.callStatic.transfer(
      await owner.getAddress(),
      await token.getAddress(),
      recipients,
      ethers.parseEther("10")
    );
    expect(result).to.equal(true);
  });
});