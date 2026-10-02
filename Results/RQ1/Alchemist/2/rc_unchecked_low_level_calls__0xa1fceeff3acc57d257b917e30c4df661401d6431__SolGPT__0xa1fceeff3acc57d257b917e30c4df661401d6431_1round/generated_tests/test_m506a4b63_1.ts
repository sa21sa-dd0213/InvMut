import { expect } from "chai";
import { ethers } } from "hardhat";

describe("AirDropContract mutant test - m506a4b63", function () {
  it("should kill the mutant by verifying transfers actually occur", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy AirDropContract
    const Factory = await ethers.getContractFactory("AirDropContract");
    const airdrop = await Factory.deploy();
    await airdrop.waitForDeployment();

    // Deploy a simple ERC20 token to test transferFrom
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await TokenFactory.deploy("Mock", "MCK", 18);
    await token.waitForDeployment();

    // Mint tokens to owner and approve the airdrop contract
    const mintAmount = ethers.parseEther("1000");
    await token.mint(owner.address, mintAmount);
    await token.connect(owner).approve(await airdrop.getAddress(), mintAmount);

    // Prepare recipients and amounts
    const recipients = [addr1.address, addr2.address];
    const amounts = [ethers.parseEther("100"), ethers.parseEther("200")];

    // Call transfer on the airdrop contract
    const tx = await airdrop.connect(owner).transfer(
      await token.getAddress(),
      recipients,
      amounts
    );
    await tx.wait();

    // Check that the transfers actually happened (this will pass on original, fail on mutant)
    const balance1 = await token.balanceOf(addr1.address);
    const balance2 = await token.balanceOf(addr2.address);
    
    expect(balance1).to.equal(ethers.parseEther("100"));
    expect(balance2).to.equal(ethers.parseEther("200"));
  });
});