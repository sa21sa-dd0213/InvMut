import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant detection - keccak256 vs sha256", function () {
  it("should detect mutant that uses sha256 instead of keccak256 for function selector", async function () {
    // Deploy the contract (no constructor arguments for EBU)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const [owner, from, to] = await ethers.getSigners();

    // Deploy a simple ERC20-like token to test transferFrom
    const TokenFactory = await ethers.getContractFactory("ERC20");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Mint tokens to 'from' address and approve the EBU contract to spend them
    const mintAmount = ethers.parseEther("100");
    await token.mint(from.address, mintAmount);
    await token.connect(from).approve(await instance.getAddress(), mintAmount);

    // Prepare transfer parameters: from, token address, recipients array, values array
    const recipients = [to.address];
    const values = [ethers.parseEther("10")];

    // Call transfer on EBU - this should trigger transferFrom on the token
    const tx = await instance.connect(owner).transfer(from.address, await token.getAddress(), recipients, values);
    await tx.wait();

    // Check balances: 'to' should have received tokens if the correct keccak256 selector was used
    const toBalance = await token.balanceOf(to.address);
    
    // On original (keccak256), toBalance should be 10 tokens
    // On mutant (sha256), the call fails silently and toBalance remains 0
    expect(toBalance).to.equal(ethers.parseEther("10"));
  });
});