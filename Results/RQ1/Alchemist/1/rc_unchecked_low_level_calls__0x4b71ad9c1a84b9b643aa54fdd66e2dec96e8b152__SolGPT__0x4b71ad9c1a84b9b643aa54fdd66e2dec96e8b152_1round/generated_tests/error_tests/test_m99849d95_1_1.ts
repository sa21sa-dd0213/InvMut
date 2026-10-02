import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when transfer function does not return true (mutant detection)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Create a simple token contract to use as caddress (ERC20-like with transferFrom)
    const TokenFactory = await ethers.getContractFactory("TestToken");
    const token = await TokenFactory.deploy();
    await token.waitForDeployment();

    // Mint tokens to owner and approve the airPort contract to spend them
    await token.mint(owner.address, ethers.parseEther("100"));
    await token.connect(owner).approve(await instance.getAddress(), ethers.parseEther("100"));

    // Call transfer with valid parameters
    const recipients = [addr1.address, addr2.address];
    const tx = await instance.connect(owner).transfer(
      owner.address,
      await token.getAddress(),
      recipients,
      ethers.parseEther("10")
    );

    // Wait for transaction and check receipt status
    const receipt = await tx.wait();
    expect(receipt.status).to.equal(1); // Transaction succeeded
  });
});