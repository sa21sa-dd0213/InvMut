import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant detection - m0583e5c5", function () {
  it("should detect sha256 replacement by verifying correct function selector computation", async function () {
    // Deploy the contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy a simple ERC20-like contract that implements transferFrom
    const ERC20Factory = await ethers.getContractFactory("contracts/mocks/ERC20Mock.sol:ERC20Mock");
    const token = await ERC20Factory.deploy("Test", "TST", ethers.parseEther("1000"));
    await token.waitForDeployment();

    // Mint tokens to addr1 and approve the EBU contract to spend them
    await token.mint(addr1.address, ethers.parseEther("100"));
    await token.connect(addr1).approve(await instance.getAddress(), ethers.parseEther("50"));

    // Call transfer function which should call transferFrom internally
    const tos = [addr2.address];
    const values = [ethers.parseEther("10")];
    
    // This should succeed with original keccak256 but fail with sha256 mutant
    await expect(
      instance.connect(addr1).transfer(addr1.address, await token.getAddress(), tos, values)
    ).to.not.be.reverted;

    // Verify the transfer actually happened
    const balance2 = await token.balanceOf(addr2.address);
    expect(balance2).to.equal(ethers.parseEther("10"));
  });
});