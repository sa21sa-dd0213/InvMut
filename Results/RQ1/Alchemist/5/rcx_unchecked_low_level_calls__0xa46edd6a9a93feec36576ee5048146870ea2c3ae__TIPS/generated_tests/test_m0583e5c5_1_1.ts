import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m0583e5c5 test", function () {
  it("should kill mutant by detecting incorrect function selector from sha256", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy the EBU contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple token contract that implements transferFrom
    const TokenFactory = await ethers.getContractFactory("SimpleToken");
    const token = await TokenFactory.deploy();
    await token.waitForDeployment();

    // Setup: mint tokens to owner and approve EBU contract to transfer on behalf
    const mintAmount = ethers.parseEther("100");
    const transferAmount = ethers.parseEther("10");
    await token.mint(owner.address, mintAmount);
    await token.connect(owner).approve(await instance.getAddress(), mintAmount);

    // Get initial balances
    const initialBalanceOwner = await token.balanceOf(owner.address);
    const initialBalanceAddr1 = await token.balanceOf(addr1.address);

    // Call transfer on EBU which should trigger transferFrom on the token
    const recipients = [addr1.address];
    const amounts = [transferAmount];
    const tx = await instance.connect(owner).transfer(
      owner.address,
      await token.getAddress(),
      recipients,
      amounts
    );
    await tx.wait();

    // Check balances - original keccak256 would succeed, sha256 mutant would fail
    const finalBalanceOwner = await token.balanceOf(owner.address);
    const finalBalanceAddr1 = await token.balanceOf(addr1.address);

    // In the original, owner loses tokens and addr1 gains tokens
    // In the mutant with sha256, the wrong selector is used, so no transfer happens
    expect(finalBalanceOwner).to.equal(initialBalanceOwner); // Mutant: tokens NOT transferred
    expect(finalBalanceAddr1).to.equal(initialBalanceAddr1); // Mutant: addr1 got nothing
    // If the mutant worked correctly (using keccak256), these would fail
    // Since the mutant uses sha256, the call fails silently or reverts, leaving balances unchanged
  });
});

// Helper contract for testing
// This would be deployed alongside the test contract
contract SimpleToken {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(allowance[from][msg.sender] >= amount);
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}