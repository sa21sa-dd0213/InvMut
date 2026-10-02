import { expect } from "chai";
import { ethers } from "hardhat";

describe("airDrop mutant kill test", function () {
  it("should kill the mutant that changes ** to * by checking value calculation with decimals", async function () {
    const [owner, from, to1] = await ethers.getSigners();

    // Deploy the airDrop contract (no constructor arguments)
    const Factory = await ethers.getContractFactory("airDrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Test case: use _decimals = 2 and v = 5
    // Original: _value = 5 * 10**2 = 500
    // Mutant:   _value = 5 * 10 * 2 = 100
    // We can verify by calling transfer and checking behavior via a revert check
    // (since we can't directly observe _value, we rely on the function's logic)

    const v = 5;
    const _decimals = 2;
    const recipients = [to1.address];

    // In original, the call will attempt to transfer 500 tokens (5 * 100)
    // In mutant, it will attempt to transfer 100 tokens (5 * 10 * 2)
    // We can't directly test the value without a mock token, but we can
    // test that the function behaves differently by checking a scenario
    // where the mutant's incorrect value would cause a revert while original passes

    // Since the contract calls transferFrom on an arbitrary token address,
    // we can use a simple token to verify the value difference
    // Deploy a minimal ERC20 for testing
    const tokenFactory = await ethers.getContractFactory("TestERC20");
    const token = await tokenFactory.deploy();
    await token.waitForDeployment();

    // Mint tokens to 'from' address
    await token.mint(from.address, ethers.parseEther("1000"));

    // Approve the airDrop contract to spend from 'from'
    await token.connect(from).approve(await instance.getAddress(), ethers.parseEther("1000"));

    // Now call transfer - with original it will try to transfer 500 wei
    // With mutant it will try to transfer 100 wei (5 * 10 * 2)
    // If we set allowance to exactly 200, original fails, mutant passes
    await token.connect(from).approve(await instance.getAddress(), 200);

    // Original: reverts because 500 > 200
    // Mutant: passes because 100 <= 200
    const tx = instance.transfer(from.address, await token.getAddress(), recipients, v, _decimals);

    // If the implementation is the original, this should revert
    // If it's the mutant, it should not revert
    // We expect revert for the original, so if it doesn't revert, mutant is killed
    await expect(tx).to.be.reverted;
  });
});

// Helper contract for testing
contract TestERC20 {
    string public name = "Test";
    string public symbol = "TST";
    uint8 public decimals = 0;
    mapping(address => uint) public balanceOf;
    mapping(address => mapping(address => uint)) public allowance;

    function mint(address to, uint amount) external {
        balanceOf[to] += amount;
    }

    function transferFrom(address from, address to, uint amount) external returns (bool) {
        require(balanceOf[from] >= amount);
        require(allowance[from][msg.sender] >= amount);
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;
        return true;
    }

    function approve(address spender, uint amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }
}